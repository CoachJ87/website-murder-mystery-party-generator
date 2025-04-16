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
    // Try to parse the request body
    const requestBody = await req.json().catch(error => {
      console.log("Error parsing request body:", error);
      return {};
    });

    // Log request details
    console.log("Request method:", req.method);
    console.log("Prompt version:", requestBody.promptVersion || 'free');
    console.log("Messages count:", requestBody.messages?.length || 0);

    // Check if we should use the real API
    const useRealAPI = process.env.USE_REAL_API === 'true';
    console.log("Using real API:", useRealAPI);

    if (!useRealAPI) {
      // If not using real API, return mock response
      const mockResponse = {
        id: "msg_mock",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "# \"MYSTERY MANSION\" - A CLASSIC MURDER MYSTERY\n\n## PREMISE\nA group of strangers receive mysterious invitations to an isolated mansion on a stormy night. Their enigmatic host, Mr. Blackwood, has gathered them to reveal shocking secrets from their past. Before he can make his announcement, the lights go out, and Mr. Blackwood is found murdered in his study. With the bridge washed out and phone lines down, the guests are trapped with a killer among them.\n\n## VICTIM\n**Mr. Edward Blackwood** - A wealthy recluse with a reputation for collecting secrets and using them as leverage. Known for his ruthless business tactics and mysterious past, Blackwood had connections to each guest and was preparing to reveal damaging information about them all.\n\n## MURDER METHOD\nBlackwood was stabbed with an antique letter opener from his desk during a momentary blackout caused by the storm. The murder weapon was wiped clean of prints and placed back on the desk, but slight traces of blood remained on the killer's cuff. The study door was locked from the inside, creating an apparent impossible crime scene until a secret passage behind the bookcase was later discovered.\n\n## CHARACTER LIST (8 PLAYERS)\n1. **Dr. James/Judith Morgan** - Blackwood's personal physician with a gambling problem and mounting debts that threatened to end their medical career.\n2. **Professor William/Wilma Hayes** - A historian who once partnered with Blackwood on an archaeological expedition that ended in scandal.\n3. **Lady Elizabeth/Lord Edward Pembroke** - Aristocrat whose family fortune is dwindling and who was seeking a marriage of convenience with the wealthy Blackwood.\n4. **Detective Michael/Michelle Stone** - A private investigator hired by Blackwood to gather dirt on the other guests, now trying to solve the case.\n5. **Chef Antonio/Antonia Rossi** - Blackwood's personal chef who previously worked for a rival who died under mysterious circumstances.\n6. **Ms. Rebecca/Mr. Robert Walsh** - Blackwood's secretary who knows all his secrets and was secretly altering his will.\n7. **Colonel Henry/Henrietta Fleming** - A retired military officer with a shared history with Blackwood from their days in foreign intelligence.\n8. **Miss Olivia/Mr. Oliver Grant** - Blackwood's estranged relative and heir who arrived unexpectedly just before the murder.\n\nWould this murder mystery concept work for your event? You can continue to make edits, and once you're satisfied, press the 'Generate Mystery' button to create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!"
          }
        ],
        model: "claude-3-7-sonnet-20250219",
        stop_reason: "end_turn",
        usage: {
          input_tokens: 10,
          output_tokens: 200
        }
      };

      // Return the mock response with proper CORS headers
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

    // If we get here, we're using the real API
    console.log("Preparing to call Anthropic API...");

    // Get appropriate prompt from environment variables
    const promptVersion = requestBody.promptVersion || 'free';
    let systemPrompt;
    
    if (promptVersion === 'paid') {
      systemPrompt = process.env.MURDER_MYSTERY_PAID_PROMPT;
    } else {
      systemPrompt = process.env.MURDER_MYSTERY_FREE_PROMPT;
    }
    
    if (!systemPrompt) {
      console.error("Prompt not found in environment variables");
      throw new Error(`${promptVersion.toUpperCase()} prompt is not available`);
    }
    
    // Format messages for Claude API
    let messages = [];
    if (Array.isArray(requestBody.messages)) {
      for (const msg of requestBody.messages) {
        if (!msg || typeof msg !== 'object') continue;
        
        let role;
        if ('role' in msg) {
          role = msg.role;
        } else if ('is_ai' in msg) {
          role = msg.is_ai ? "assistant" : "user";
        } else {
          continue;
        }
        
        const content = typeof msg.content === 'string' ? msg.content : '';
        messages.push({ role, content });
      }
    }
    
    // Add default message if empty
    if (messages.length === 0) {
      messages.push({
        role: "user",
        content: "Create a murder mystery game."
      });
    }
    
    // Create request for Anthropic API
    const anthropicRequest = {
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1500,
      messages: messages,
      system: systemPrompt
    };
    
    console.log("Calling Anthropic API with request:");
    console.log("- Model:", anthropicRequest.model);
    console.log("- Messages:", anthropicRequest.messages.length);
    console.log("- System prompt length:", systemPrompt.length);
    
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
    
    console.log("Anthropic API response status:", response.status);
    
    if (!response.ok) {
      console.error("Error from Anthropic API:", response.status);
      throw new Error(`Anthropic API returned status ${response.status}`);
    }
    
    // Parse response and return
    const data = await response.json();
    console.log("Successfully processed Anthropic response");
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
      },
    });
  } catch (error) {
    console.error("Error handling request:", error);
    
    // Return error with proper CORS headers
    return new Response(JSON.stringify({ 
      error: error.message || "Unknown error", 
      type: error.name || "Error",
      content: [
        {
          type: "text",
          text: "An error occurred while processing your request. Please try again later."
        }
      ]
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
