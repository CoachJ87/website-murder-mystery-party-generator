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
    // STEP 1: Parse and validate the request body
    let requestData;
    try {
      const text = await req.text();
      console.log("Raw request body:", text.substring(0, 100) + "...");
      requestData = JSON.parse(text);
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
    
    // STEP 2: Check prompt version
    const promptVersion = requestData.promptVersion || 'free';
    console.log("Prompt version:", promptVersion);
    
    // STEP 3: Get prompt from environment variables
    let systemPrompt;
    try {
      if (promptVersion === 'paid') {
        systemPrompt = process.env.MURDER_MYSTERY_PAID_PROMPT;
      } else {
        systemPrompt = process.env.MURDER_MYSTERY_FREE_PROMPT;
      }
      
      if (!systemPrompt) {
        return new Response(JSON.stringify({ 
          error: `${promptVersion.toUpperCase()} prompt is not defined in environment variables`,
          envVars: Object.keys(process.env).filter(key => !key.toLowerCase().includes('key')).join(', ')
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      console.log("System prompt length:", systemPrompt.length);
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: "Error accessing environment variables",
        details: e.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // STEP 4: Verify API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ 
        error: "Anthropic API key not found in environment variables"
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    console.log("API key exists:", !!process.env.ANTHROPIC_API_KEY);
    
    // STEP 5: Format messages
    let messages = [];
    try {
      if (!Array.isArray(requestData.messages)) {
        return new Response(JSON.stringify({ 
          error: "Messages must be an array",
          received: typeof requestData.messages
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      
      // Format messages for Claude API
      for (const msg of requestData.messages) {
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
      
      // Add default message if empty
      if (messages.length === 0) {
        messages.push({
          role: "user",
          content: "Create a murder mystery game."
        });
      }
      
      console.log("Formatted messages count:", messages.length);
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: "Error formatting messages",
        details: e.message
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // STEP 6: Create Anthropic request
    const anthropicRequest = {
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1500,
      messages: messages,
      system: systemPrompt
    };
    
    console.log("Anthropic request prepared");
    
    // STEP 7: Call Anthropic API
    console.log("Calling Anthropic API...");
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicRequest),
    });
    
    // STEP 8: Process response
    console.log("Received response from Anthropic API:", response.status);
    
    if (!response.ok) {
      let errorText;
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }
      
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
    
    // STEP 9: Return successful response
    const data = await response.json();
    console.log("Successfully processed Anthropic response");
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error("Unhandled error in proxy-with-prompts:", error);
    return new Response(JSON.stringify({ 
      error: "Unhandled server error",
      message: error.message,
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
