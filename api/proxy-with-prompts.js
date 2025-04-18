
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  console.log("----- NEW REQUEST TO PROXY-WITH-PROMPTS -----");
  console.log(`Request method: ${req.method}`);
  console.log(`Request URL: ${req.url}`);

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

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`Error: Method ${req.method} not allowed`);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
  
  try {
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
      console.log(`Raw request body (first 500 chars): ${rawBody.substring(0, 500)}...`);
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
      console.log("Using paid prompt");
    } else {
      systemPrompt = process.env.MURDER_MYSTERY_FREE_PROMPT;
      console.log("Using free prompt");
    }

    if (!systemPrompt) {
      console.error(`Environment variable for ${promptVersion} prompt is not set.`);
      console.log("Using mock response due to missing system prompt");
      
      // Return mock response if system prompt is not available
      const mockResponse = {
        choices: [{
          message: {
            content: "# \"THE MISSING PROMPT\" - A DEBUGGING MYSTERY\n\n## PREMISE\nIt appears the system prompt is missing, but I can still help you create a murder mystery!\n\n## VICTIM\n**The System Prompt** - Mysteriously disappeared without a trace.\n\n## SUSPECTS\n1. **The Environment Variables** - Known to go missing in deployment\n2. **The Configuration** - Often misunderstood and misconfigured\n3. **The Deployment Process** - Sometimes drops important settings\n\nWhat theme would you like for your murder mystery? I can help you create something fun despite this technical hiccup!"
          }
        }]
      };
      
      console.log("Returning mock response due to missing system prompt");
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
      });
    }
    
    console.log(`System prompt exists (first 100 chars): ${systemPrompt.substring(0, 100)}...`);

    const useRealAPI = process.env.USE_REAL_API === 'true';
    console.log(`USE_REAL_API: ${useRealAPI}`);

    if (!useRealAPI) {
      console.log("USE_REAL_API is false, returning mock response");
      // Return mock response
      const mockResponse = {
        id: "msg_mock",
        choices: [{
          message: {
            content: "# \"DEBUGGING MODE\" - A MURDER MYSTERY\n\n## PREMISE\nThis is a debug response to verify the API endpoint is being called correctly.\n\n## VICTIM\n**The API** - Mysteriously not showing any logs or errors.\n\n## CHARACTER LIST (4 PLAYERS)\n1. **The Frontend** - Sends requests but doesn't see proper responses.\n2. **The Backend** - Processes requests but might have issues.\n3. **The Environment Variables** - Might be missing or invalid.\n4. **The Claude API** - The external service that might be rejecting our calls.\n\nWould this murder mystery concept work for your event? You can continue to make edits, and once you're satisfied, press the 'Generate Mystery' button to create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!"
          }
        }],
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

    console.log("Backend - anthropicRequest structure:", JSON.stringify({
      model: anthropicRequest.model,
      max_tokens: anthropicRequest.max_tokens,
      message_count: anthropicRequest.messages.length,
      system_prompt_length: anthropicRequest.system ? anthropicRequest.system.length : 0
    }));

    console.log("Calling Anthropic API...");

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
    console.log(`Anthropic API response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API error: ${response.status} - ${errorText}`);
      return new Response(JSON.stringify({ 
        error: `Anthropic API error: ${response.status}`, 
        details: errorText,
        choices: [{
          message: {
            content: `There was an error processing your request: ${response.status}. Please try again.`
          }
        }] 
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
      });
    }
    const data = await response.json();
    console.log("Anthropic API response data (structure):", JSON.stringify({
      id: data.id,
      model: data.model,
      type: data.type,
      role: data.role,
      content_length: data.content ? data.content.length : 'unknown',
      usage: data.usage
    }));

    // Return the response
    console.log("Successfully returning Anthropic API response");
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
      choices: [{
        message: {
          content: `There was an error processing your request: ${error.message}. Please try again.`
        }
      }]
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
