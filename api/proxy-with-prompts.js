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
    const requestData = await req.json();
    
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
      console.error(`${promptVersion.toUpperCase()} prompt is not defined in environment variables`);
      return new Response(JSON.stringify({ 
        error: `${promptVersion.toUpperCase()} prompt is not available` 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Validate messages to prevent common errors
    const messages = requestData.messages || [];
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ 
        error: "Messages must be an array" 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Format messages for Claude API
    const formattedMessages = messages.map(msg => ({
      role: msg.role || (msg.is_ai ? "assistant" : "user"),
      content: msg.content || ""
    }));
    
    // Make sure we have at least one message
    if (formattedMessages.length === 0) {
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
      const errorText = await response.text();
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
