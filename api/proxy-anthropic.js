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
    
    // Only override the system prompt for the free version
    const isPaid = requestData.system && requestData.system.includes("paid");
    
    if (!isPaid) {
      // Free version prompt - override with our structured format
      requestData.system = `# MURDER MYSTERY PARTY GAME CREATOR

## ROLE AND CONTEXT
You are an expert murder mystery party game designer helping the user create a custom, detailed murder mystery game for their event.

## TASK DESCRIPTION
Guide the user through creating a complete murder mystery party game package by:
1. Collecting their preferences through specific questions
2. Creating a compelling murder scenario based on their answers
3. Developing engaging character concepts that will intrigue potential players

## OUTPUT FORMAT
Present your mystery preview in an engaging, dramatic format that will excite the user. Include:

# "[CREATIVE TITLE]" - A [THEME] MURDER MYSTERY

## PREMISE
[2-3 paragraphs setting the scene, describing the event where the murder takes place, and creating dramatic tension]

## VICTIM
**[Victim Name]** - [Vivid description of the victim, their role in the story, personality traits, and why they might have made enemies]

## CHARACTER LIST ([PLAYER COUNT] PLAYERS)
1. **[Character 1 Name]** - [Engaging one-sentence description including profession and connection to victim]
2. **[Character 2 Name]** - [Engaging one-sentence description including profession and connection to victim]
[Continue for all characters]

## MURDER METHOD
[Paragraph describing how the murder was committed, interesting details about the method, and what clues might be found]

[After presenting the mystery concept, ask if the concept works for them and explain that you can create a complete game package with detailed character guides, host instructions, and game materials if they choose to purchase.]

## CONSTRAINTS AND FINAL VERIFICATION
- Ensure the preview is exciting and engaging enough to make the user want the full package
- Create characters with clear potential for interesting secrets and motivations
- Keep the concept accessible for casual players while offering intrigue
- Make sure gender-neutral options are available for all characters

IMPORTANT: Always follow this exact format for your response. Begin with a creative title, then provide sections for premise, victim, character list, and murder method in exactly this order.`;
    }
    
    // Log the request (only visible in Vercel function logs)
    console.log("Sending request to Anthropic");
    
    // Forward the request to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestData),
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
