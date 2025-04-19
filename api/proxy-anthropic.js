
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
    
    // Get appropriate prompt from environment variables or use the provided system instruction
    let systemPrompt;
    if (requestData.system) {
      systemPrompt = requestData.system;
    } else if (promptVersion === 'paid') {
      systemPrompt = process.env.MURDER_MYSTERY_PAID_PROMPT;
    } else {
      systemPrompt = process.env.MURDER_MYSTERY_FREE_PROMPT;
    }
    
    // Add a context reminder to help the AI maintain awareness of the user's preferences
    const contextReminder = "Remember details the user has already provided and don't ask about them again. Be consistent in your responses.";
    systemPrompt = systemPrompt + "\n\n" + contextReminder;
    
    // Ensure messages only contain user and assistant roles, not system
    const filteredMessages = requestData.messages ? 
      requestData.messages.filter(msg => msg.role === 'user' || msg.role === 'assistant') : 
      [];
    
    // Log the structure of what we're sending to Anthropic
    console.log(`Sending ${filteredMessages.length} messages to Anthropic with system prompt`);
    
    // Prepare Anthropic API request with system at the top level
    const anthropicRequest = {
      model: "claude-3-7-sonnet-20250219", // Using the latest model
      max_tokens: 1000,
      messages: filteredMessages,
      system: systemPrompt,
      temperature: 0.7 // Add some creativity but keep responses consistent
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
    
    // Get the response data
    const data = await response.json();
    
    // Return the Anthropic API response
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    // Handle errors
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
