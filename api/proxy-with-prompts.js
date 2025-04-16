export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
  
  try {
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body", 
        details: e.message 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Check which prompt to use
    const promptVersion = requestData.promptVersion || 'free';
    
    // Get appropriate prompt from environment variables
    let systemPrompt;
    if (promptVersion === 'paid') {
      systemPrompt = process.env.MURDER_MYSTERY_PAID_PROMPT;
    } else {
      systemPrompt = process.env.MURDER_MYSTERY_FREE_PROMPT;
    }
    
    // Make sure we have a valid prompt
    if (!systemPrompt) {
      return new Response(JSON.stringify({ 
        error: `${promptVersion.toUpperCase()} prompt is not defined in environment variables` 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Validate messages
    let messages = requestData.messages || [];
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ 
        error: "Messages must be an array",
        receivedType: typeof messages
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Format messages for Claude API
    const formattedMessages = [];
    
    for (const msg of messages) {
      // Skip empty or invalid messages
      if (!msg || typeof msg !== 'object') continue;
      
      let role;
      if ('role' in msg) {
        role = msg.role;
      } else if ('is_ai' in msg) {
        role = msg.is_ai ? "assistant" : "user";
      } else {
        continue; // Skip messages without role or is_ai
      }
      
      const content = msg.content || "";
      
      if (typeof content !== 'string') {
        return new Response(JSON.stringify({ 
          error: "Message content must be a string",
          receivedType: typeof content,
          messageObject: JSON.stringify(msg)
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      formattedMessages.push({ role, content });
    }
    
    // Ensure we have at least one message
    if (formattedMessages.length === 0) {
      // Add a default message if none provided
      formattedMessages.push({
        role: "user",
        content: "Create a murder mystery game."
      });
    }
    
    // Prepare Anthropic API request
    const anthropicRequest = {
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1500,
      messages: formattedMessages,
      system: systemPrompt
    };
    
    // Log the request for debugging
    console.log("Sending to Claude API:", JSON.stringify({
      modelName: anthropicRequest.model,
      messageCount: anthropicRequest.messages.length,
      systemPromptLength: systemPrompt.length,
    }));
    
    // Forward the request to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicRequest),
    });
    
    // Check if the response was successful
    if (!response.ok) {
      let errorText;
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }
      
      console.error(`Anthropic API error: ${response.status} - ${errorText}`);
      return new Response(JSON.stringify({ 
        error: "Error from Anthropic API", 
        status: response.status,
        details: errorText
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Get the response data
    const data = await response.json();
    
    // Return the Anthropic API response
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error("Error in proxy-with-prompts:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      name: error.name 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
