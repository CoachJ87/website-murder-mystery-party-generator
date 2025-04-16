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
    
    // Post-process the response to clean up formatting issues
    if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
      let text = data.content[0].text;
      
      // Remove $2 markers and **$2** markers
      text = text.replace(/\$2|\*\*\$2\*\*/g, '');
      
      // Fix character numbering (change multiple 1. to sequential numbering)
      const characterListMatch = text.match(/## CHARACTER LIST \((\d+) PLAYERS\)([\s\S]*?)(?=##|Would this|$)/i);
      if (characterListMatch) {
        const characterCount = parseInt(characterListMatch[1]);
        let characterList = characterListMatch[2];
        
        // Find character entries (looking for pattern like "1. **Name**")
        const characters = characterList.match(/\d+\.\s+\*\*[^*]+\*\*[^\n]+/g) || [];
        
        // If we found characters and need to renumber them
        if (characters.length > 0) {
          let renumberedList = characterList;
          
          // Replace each character entry with correctly numbered version
          for (let i = 0; i < characters.length; i++) {
            const oldEntry = characters[i];
            const newEntry = oldEntry.replace(/^\d+\./, `${i+1}.`);
            renumberedList = renumberedList.replace(oldEntry, newEntry);
          }
          
          // Replace character list in text
          text = text.replace(characterListMatch[0], `## CHARACTER LIST (${characterCount} PLAYERS)${renumberedList}`);
        }
      }
      
      // Ensure headings are in correct order
      const hasTitle = /^# "[^"]+"/m.test(text);
      const hasPremise = /^## PREMISE/m.test(text);
      const hasVictim = /^## VICTIM/m.test(text);
      const hasMurderMethod = /^## MURDER METHOD/m.test(text);
      const hasCharacters = /^## CHARACTER LIST/m.test(text);
      
      // If we're missing any required sections or they're in wrong order, try to fix
      if (!hasTitle || !hasPremise || !hasVictim || !hasMurderMethod || !hasCharacters) {
        // Extract sections
        const titleMatch = text.match(/# "[^"]+"/);
        const premiseMatch = text.match(/## PREMISE[\s\S]*?(?=##|$)/);
        const victimMatch = text.match(/## VICTIM[\s\S]*?(?=##|$)/);
        const murderMatch = text.match(/## MURDER METHOD[\s\S]*?(?=##|$)/);
        const charactersMatch = text.match(/## CHARACTER LIST[\s\S]*?(?=Would this|$)/);
        
        // Rebuild text in correct order
        let rebuiltText = '';
        if (titleMatch) rebuiltText += titleMatch[0] + '\n\n';
        if (premiseMatch) rebuiltText += premiseMatch[0] + '\n\n';
        if (victimMatch) rebuiltText += victimMatch[0] + '\n\n';
        if (murderMatch) rebuiltText += murderMatch[0] + '\n\n';
        if (charactersMatch) rebuiltText += charactersMatch[0];
        
        // Add closing text if not already present
        if (!rebuiltText.includes('Would this murder mystery concept work')) {
          rebuiltText += '\nWould this murder mystery concept work for your event? You can continue to make edits, and once you\'re satisfied, press the \'Generate Mystery\' button to create a complete game package with detailed character guides, host instructions, and all the game materials you\'ll need if you choose to purchase the full version!';
        }
        
        // Use rebuilt text if it contains all necessary sections
        if (rebuiltText.includes('PREMISE') && rebuiltText.includes('VICTIM') && 
            rebuiltText.includes('MURDER METHOD') && rebuiltText.includes('CHARACTER LIST')) {
          text = rebuiltText;
        }
      }
      
      // Ensure correct closing text
      if (!text.includes('Would this murder mystery concept work for your event?')) {
        // Remove any existing closing text
        text = text.replace(/Let me develop this[\s\S]*$/, '');
        text = text.replace(/I'll expand this concept[\s\S]*$/, '');
        
        // Add proper closing text
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
