// api/proxy-with-prompts.js
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  console.log(`Handler started at ${new Date().toISOString()}`);
  
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
    console.log(`Parsing request body at ${new Date().toISOString()}`);
    // Parse the request body
    const requestData = await req.json();
    
    // Check which prompt to use
    const promptVersion = requestData.promptVersion || 'free';
    console.log(`Using ${promptVersion} prompt version`);
    
    // Get appropriate prompt from environment variables
    let systemPrompt;
    if (promptVersion === 'paid') {
      systemPrompt = process.env.MURDER_MYSTERY_PAID_PROMPT;
    } else {
      systemPrompt = process.env.MURDER_MYSTERY_FREE_PROMPT;
    }
    
    // Check if prompts are available
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
    
    console.log(`Prompt length: ${systemPrompt.length} characters`);
    console.log(`Message count: ${requestData.messages?.length || 0}`);
    
    // Prepare Anthropic API request
    const anthropicRequest = {
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      messages: requestData.messages || [],
      system: systemPrompt
    };
    
    // Forward the request to Anthropic API
    console.log(`Calling Anthropic API at ${new Date().toISOString()}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicRequest),
    });
    
    console.log(`Anthropic API responded at ${new Date().toISOString()} with status: ${response.status}`);
    
    // Check if the response was successful
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Anthropic API error:", JSON.stringify(errorData));
      return new Response(JSON.stringify({ 
        error: "Error from Anthropic API", 
        details: errorData 
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Get the response data
    console.log(`Parsing Anthropic response at ${new Date().toISOString()}`);
    const data = await response.json();
    console.log(`Anthropic response parsed at ${new Date().toISOString()}`);
    
    // Return the Anthropic API response
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error(`Error in handler at ${new Date().toISOString()}:`, error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      name: error.name,
      time: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
