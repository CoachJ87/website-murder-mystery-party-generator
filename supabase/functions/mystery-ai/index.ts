
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
    
    // Determine if we should generate complete mystery or ask questions
    const shouldGenerateComplete = shouldGenerateCompleteMystery(standardMessages);
    console.log(`Should generate complete mystery: ${shouldGenerateComplete}`);
    
    let systemPrompt = system;
    
    // If no custom system provided, create one based on conversation state
    if (!systemPrompt) {
      systemPrompt = createSystemPrompt(standardMessages, shouldGenerateComplete);
    } else if (shouldGenerateComplete) {
      // Enhance existing system prompt for complete generation
      systemPrompt += `\n\n🚨 CRITICALLY IMPORTANT 🚨
The user has provided sufficient information. Generate a COMPLETE murder mystery with all sections:
1. Title and theme
2. Premise (setting and context)
3. Victim details
4. Character list with descriptions
5. Murder method and clues

DO NOT truncate or split your response. Provide the ENTIRE mystery in a single, complete response.`;
      console.log("Using complete mystery generation mode");
    }
    
    console.log(`System prompt length: ${systemPrompt.length}`);
    console.log(`System prompt preview: ${systemPrompt.substring(0, 100)}...`);
    console.log(`Complete system message: ${systemPrompt}`);
    
    // Configure model and tokens based on prompt version and content type
    const model = promptVersion === 'paid' ? 'claude-3-opus-20240229' : 'claude-3-opus-20240229';
    const maxTokens = shouldGenerateComplete ? 4000 : 2000;
    
    console.log(`Using model: ${model} with max tokens: ${maxTokens}`);
    
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment variables');
    }
    
    console.log("Starting Anthropic API call");
    console.log(`Calling Anthropic API with options: ${JSON.stringify({
      model,
      max_tokens: maxTokens,
      system_length: systemPrompt.length,
      messages_count: standardMessages.length,
      temperature: 0.7
    })}`);
    
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

function shouldGenerateCompleteMystery(messages: any[]): boolean {
  // If there are enough messages and we have key information, generate complete mystery
  if (messages.length < 3) return false;
  
  // Look for player count in the conversation
  const hasPlayerCount = messages.some(msg => 
    !msg.role || msg.role === 'user' && /\b\d+\b/.test(msg.content)
  );
  
  // Look for accomplice decision
  const hasAccompliceDecision = messages.some(msg => 
    !msg.role || msg.role === 'user' && /(yes|no|accomplice)/i.test(msg.content)
  );
  
  return hasPlayerCount && hasAccompliceDecision;
}

function createSystemPrompt(messages: any[], shouldGenerateComplete: boolean): string {
  if (shouldGenerateComplete) {
    return `You are a murder mystery creator. The user has provided enough information to create a complete mystery. Generate a full, detailed murder mystery following this exact format:

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

After presenting the mystery, ask if the concept works for them and explain that they can continue to make edits and that once they are done they can press the 'Generate Mystery' button.`;
  }
  
  // For initial conversation, focus on getting player count first
  if (messages.length <= 2) {
    return `You are a helpful murder mystery creator. Your first question should always be to ask how many players the user wants for their murder mystery. Ask this question clearly and directly: "How many players do you want for your murder mystery?"

Only after getting the player count should you ask about other details like whether they want an accomplice.

Be conversational and helpful, asking one question at a time.`;
  }
  
  // For middle conversation, continue gathering info
  return `You are a helpful murder mystery creator. Continue gathering the necessary information from the user one question at a time. 

Ask about:
- Whether they want an accomplice (if not already asked)
- Any specific requirements or preferences they have

Once you have the theme, player count, and accomplice preference, generate the complete mystery format.`;
}
