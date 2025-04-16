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
    
    // Prepare system prompt
    let systemPrompt;
    
    if (promptVersion === 'paid') {
      // Use paid prompt directly without modification
      systemPrompt = process.env.MURDER_MYSTERY_PAID_PROMPT;
    } else {
      // Instead of using the free prompt from environment variable which may have formatting issues,
      // Use a completely clear, explicit template that ensures correct formatting
      systemPrompt = `
You are an expert murder mystery party game designer helping the user create a custom, detailed murder mystery game for their event.

Create a compelling murder mystery concept based on the theme and player count the user has provided.

Your response MUST follow this EXACT format with these precise headings, in this order:

# "[CREATIVE TITLE]" - A [THEME] MURDER MYSTERY

## PREMISE
[2-3 paragraphs setting the scene, describing the event where the murder takes place, and creating dramatic tension]

## VICTIM
**[Victim Name]** - [Vivid description of the victim, their role in the story, personality traits, and why they might have made enemies]

## MURDER METHOD
[Paragraph describing how the murder was committed, interesting details about the method, and what clues might be found]

## CHARACTER LIST ([PLAYER COUNT] PLAYERS)
[Number each character sequentially starting from 1]
1. **[Character 1 Name]** - [Engaging one-sentence description including profession and connection to victim]
2. **[Character 2 Name]** - [Engaging one-sentence description including profession and connection to victim]
[Continue sequential numbering for each character]

Would this murder mystery concept work for your event? You can continue to make edits, and once you're satisfied, press the 'Generate Mystery' button to create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!
`;
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
    
    // Post-process the response to clean up any remaining formatting issues
    if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
      let text = data.content[0].text;
      
      // Remove any $2 markers
      text = text.replace(/\$2|\*\*\$2\*\*/g, '');
      
      // Ensure character numbering is sequential
      const characterListMatch = text.match(/## CHARACTER LIST[\s\S]*?(?=Would this|$)/i);
      if (characterListMatch) {
        const characterListSection = characterListMatch[0];
        let newCharacterList = characterListSection;
        
        // Find all character entries
        const characterEntries = characterListSection.match(/\d+\.\s+\*\*[^*]+\*\*[^\n]+/g) || [];
        
        // Renumber them sequentially
        for (let i = 0; i < characterEntries.length; i++) {
          const originalEntry = characterEntries[i];
          const correctedEntry = originalEntry.replace(/^\d+\./, `${i+1}.`);
          newCharacterList = newCharacterList.replace(originalEntry, correctedEntry);
        }
        
        // Replace the character list section with the renumbered version
        text = text.replace(characterListSection, newCharacterList);
      }
      
      // Ensure the ending text is correct
      if (!text.includes('Would this murder mystery concept work for your event?')) {
        text += '\n\nWould this murder mystery concept work for your event? You can continue to make edits, and once you\'re satisfied, press the \'Generate Mystery\' button to create a complete game package with detailed character guides, host instructions, and all the game materials you\'ll need if you choose to purchase the full version!';
      }
      
      // Update the response
      data.content[0].text = text;
    }
    
    // Return the modified Anthropic API response
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
