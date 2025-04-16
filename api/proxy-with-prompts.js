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
    
    // Add specific formatting instructions for free version
    if (promptVersion === 'free') {
      systemPrompt += "\n\nIMPORTANT: Your output MUST follow this exact format with minimal spacing:\n\n# \"[CREATIVE TITLE]\" - A [THEME] MURDER MYSTERY\n\n## PREMISE\n[2-3 paragraphs setting the scene]\n\n## VICTIM\n**[Victim Name]** - [Description]\n\n## CHARACTER LIST ([PLAYER COUNT] PLAYERS)\n1. **[Character 1 Name]** - [Description]\n2. **[Character 2 Name]** - [Description]\n3. **[Character 3 Name]** - [Description]\n[Continue numbering each character sequentially]\n\n## MURDER METHOD\n[Paragraph describing the murder method and clues]\n\nWould this murder mystery concept work for your event? I can create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!";
    }
    
    // Now use the actual user messages rather than a fixed test message
    const anthropicRequest = {
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1500,
      messages: requestData.messages || [],
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
