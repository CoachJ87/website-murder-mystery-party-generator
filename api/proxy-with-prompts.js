export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  console.log("----- NEW REQUEST TO PROXY-WITH-PROMPTS -----");

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request");
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);

    // Try to get the real IP for debugging
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    console.log(`Request from IP: ${ip}`);

    // Log all request headers for debugging
    const headers = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log("Request headers:", JSON.stringify(headers));

    // Try to parse the request body
    let requestBody;
    let rawBody = "";
    try {
      rawBody = await req.text();
      console.log(`Raw request body (first 200 chars): ${rawBody.substring(0, 200)}...`);
      requestBody = JSON.parse(rawBody);
      console.log("Successfully parsed request body");
    } catch (error) {
      console.log(`Error parsing request body: ${error.message}`);
      console.log(`Raw body: ${rawBody}`);
      requestBody = {};
    }

    const promptVersion = requestBody.promptVersion || 'free';
    console.log(`Prompt Version: ${promptVersion}`);

    // Get prompt from environment variables
    let systemPrompt;
    if (promptVersion === 'paid') {
      systemPrompt = process.env.MURDER_MYSTERY_PAID_PROMPT;
    } else {
      systemPrompt = process.env.MURDER_MYSTERY_FREE_PROMPT;
    }

    if (!systemPrompt) {
      console.error(`Environment variable for ${promptVersion} prompt is not set.`);
      return new Response(JSON.stringify({ error: `Environment variable for ${promptVersion} prompt is not set.` }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
      });
    }
    console.log(`System prompt (first 100 chars): ${systemPrompt.substring(0, 100)}...`);

    const useRealAPI = process.env.USE_REAL_API === 'true';
    console.log(`USE_REAL_API: ${useRealAPI}`);

    if (!useRealAPI) {
      console.log("USE_REAL_API is false, returning mock response");
      // Return mock response
      const mockResponse = {
        id: "msg_mock",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "# \"DEBUGGING MODE\" - A MURDER MYSTERY\n\n## PREMISE\nThis is a debug response to verify the API endpoint is being called correctly.\n\n## VICTIM\n**The API** - Mysteriously not showing any logs or errors.\n\n## CHARACTER LIST (4 PLAYERS)\n1. **The Frontend** - Sends requests but doesn't see proper responses.\n2. **The Backend** - Processes requests but might have issues.\n3. **The Environment Variables** - Might be missing or invalid.\n4. **The Claude API** - The external service that might be rejecting our calls.\n\nWould this murder mystery concept work for your event? You can continue to make edits, and once you're satisfied, press the 'Generate Mystery' button to create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!"
          }
        ],
        model: "claude-3-7-sonnet-20250219",
        stop_reason: "end_turn",
        usage: {
          input_tokens: 10,
          output_tokens: 200
        }
      };

      console.log("Sending successful mock response");
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
      });
    }

    // Prepare Anthropic API request
    const anthropicRequest = {
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 2000,
      messages: requestBody.messages || [],
      system: systemPrompt
    };

    console.log("Backend - anthropicRequest.messages:", JSON.stringify(anthropicRequest.messages, null, 2)); // ADD THIS LINE

    console.log("Calling Anthropic API with request:", JSON.stringify(anthropicRequest));

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicRequest),
    });

    console.log(`Anthropic API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API error: ${response.status} - ${errorText}`);
      return new Response(JSON.stringify({ error: `Anthropic API error: ${response.status} - ${errorText}` }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
      });
    }
    const data = await response.json();
    console.log("Anthropic API response data:", JSON.stringify(data));


    // Return the response
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      },
    });
  } catch (error) {
    console.error(`Unhandled error: ${error.message}`);
    console.error(error.stack);

    // Return error response
    return new Response(JSON.stringify({
      error: error.message || "Unknown error",
      type: error.name || "Error",
      content: [
        {
          type: "text",
          text: `Debug error information: ${error.message}`
        }
      ]
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      },
    });
  }
}
