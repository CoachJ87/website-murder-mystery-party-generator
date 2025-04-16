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
    
    // Only use the paid prompt if explicitly requested and verified as paid
    if (promptVersion === 'paid') {
      // Here we assume the frontend has already verified purchase status
      systemPrompt = process.env.MURDER_MYSTERY_PAID_PROMPT;
    } else {
      // Always default to free version otherwise
      systemPrompt = process.env.MURDER_MYSTERY_FREE_PROMPT;
      
      // Use a completely overriding format instruction that enforces exact structure
      systemPrompt += `

CRITICAL INSTRUCTIONS FOR OUTPUT FORMAT:
You MUST generate your response using EXACTLY the following template structure with these exact headings and order - do not deviate in any way:

# "[TITLE]" - A [THEME] MURDER MYSTERY

## PREMISE
[2-3 paragraphs setting the scene]

## VICTIM
**[Victim Name]** - [Description]

## MURDER METHOD
[Paragraph describing the murder method and clues]

## CHARACTER LIST ([X] PLAYERS)
[For each character, use this exact format with sequential numbering:]
1. **[Character 1 Name]** - [Description]
2. **[Character 2 Name]** - [Description]
[Continue with exact sequential numbering until you've created all characters]

Would this murder mystery concept work for your event? You can continue to make edits, and once you're satisfied, press the 'Generate Mystery' button to create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!

DO NOT include any other symbols, markers (like $2), or additional headings in your response.`;
    }
    
    // Now use the actual user messages
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
