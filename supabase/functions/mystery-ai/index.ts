
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing request with mystery-ai edge function");
    
    const requestBody = await req.json();
    console.log("Successfully parsed request body");
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    
    const { messages, system, promptVersion = 'free', preventTruncation = false } = requestBody;
    
    console.log(`Processing request with ${messages.length} messages and prompt version: ${promptVersion}`);
    
    // Standardize message format
    const standardMessages = messages.map((msg: any) => ({
      role: msg.role || (msg.is_ai ? "assistant" : "user"),
      content: msg.content || ""
    })).filter((msg: any) => msg.content.trim() !== '');
    
    console.log(`First standardized message: ${JSON.stringify(standardMessages[0])}`);
    console.log(`Total messages count: ${standardMessages.length}`);
    
    let systemPrompt = system;
    
    // If no custom system provided, create a simple one
    if (!systemPrompt) {
      systemPrompt = createSystemPrompt(standardMessages);
    }
    
    console.log(`System prompt length: ${systemPrompt.length}`);
    console.log(`System prompt preview: ${systemPrompt.substring(0, 100)}...`);
    
    // Use consistent model and tokens
    const model = 'claude-3-opus-20240229';
    const maxTokens = 2000;
    
    console.log(`Using model: ${model} with max tokens: ${maxTokens}`);
    
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment variables');
    }
    
    console.log("Starting Anthropic API call");
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: standardMessages,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API error: ${response.status} ${errorText}`);
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Received response from Anthropic API");
    
    const assistantMessage = data.content?.[0]?.text;
    if (!assistantMessage) {
      throw new Error('No content in response from Anthropic API');
    }
    
    console.log(`Response length: ${assistantMessage.length} characters`);
    console.log(`Response preview: ${assistantMessage.substring(0, 100)}...`);
    
    // Return in OpenAI-compatible format for consistency
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: assistantMessage,
          role: "assistant"
        }
      }]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in mystery-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      choices: [{
        message: {
          content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
          role: "assistant"
        }
      }]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function createSystemPrompt(messages: any[]): string {
  // For the very first message, always ask for player count
  if (messages.length <= 1) {
    return `You are a helpful murder mystery creator. Your first question should be: "How many players do you want for your murder mystery?"

Be conversational and ask only this question first.`;
  }
  
  // For subsequent messages, continue with mystery creation
  return `You are a helpful murder mystery creator. Continue gathering the necessary information from the user one question at a time.

If you haven't asked yet, ask about:
- Number of players (if not already known)
- Whether they want an accomplice
- Any specific preferences they have

Once you have enough information, you can generate a complete mystery preview.`;
}
