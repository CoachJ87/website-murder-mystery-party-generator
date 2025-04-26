
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Anthropic } from "https://esm.sh/@anthropic-ai/sdk@0.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const freeMysteryPrompt = Deno.env.get('MYSTERY_FREE_PROMPT');
    const paidMysteryPrompt = Deno.env.get('MYSTERY_PAID_PROMPT');
    
    console.log(`Free prompt loaded: ${freeMysteryPrompt ? 'YES (length: ' + freeMysteryPrompt.length + ')' : 'NO'}`);
    console.log(`Paid prompt loaded: ${paidMysteryPrompt ? 'YES (length: ' + paidMysteryPrompt.length + ')' : 'NO'}`);
    
    if (!anthropicApiKey) {
      throw new Error("Missing Anthropic API key");
    }

    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    
    const { messages, system, promptVersion, requireFormatValidation, chunkSize } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Missing or invalid messages parameter");
    }

    console.log(`Processing request with ${messages.length} messages and prompt version: ${promptVersion}`);
    console.log(`Chunk size requested: ${chunkSize || 'default'}`);

    // Combine system prompts to ensure format is preserved
    let finalSystemPrompt = "";
    const outputFormatSection = `
## OUTPUT FORMAT
Present your murder mystery preview in an engaging, dramatic format that will excite the user. Include:

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

[After presenting the mystery concept, ask if the concept works for them and explain that they can continue to make edits and that once they are done they can press the 'Generate Mystery' button to create a complete game package with detailed character guides, host instructions, and game materials if they choose to purchase.]
`;

    if (system) {
      // If a custom system prompt is provided, make sure it includes the output format
      finalSystemPrompt = system;
      if (!system.includes("OUTPUT FORMAT") && !system.includes("# \"[CREATIVE TITLE]\"")) {
        finalSystemPrompt += "\n\n" + outputFormatSection;
      }
      console.log("Using provided system instruction with OUTPUT FORMAT appended");
    } else {
      finalSystemPrompt = promptVersion === 'paid' ? 
        (paidMysteryPrompt || "Default paid prompt") : 
        (freeMysteryPrompt || "Default free prompt");
      console.log(`Using ${promptVersion} prompt from environment`);
    }

    // Add format validation enforcement but less strict
    if (requireFormatValidation) {
      finalSystemPrompt += "\n\nIMPORTANT: Your response MUST follow the OUTPUT FORMAT specified above. Include all required sections in the order specified.";
    }

    console.log("System prompt length:", finalSystemPrompt.length);
    console.log("System prompt preview:", finalSystemPrompt.substring(0, 100) + "...");
    
    // Determine model and parameters based on the request
    let model = "claude-3-opus-20240229";
    let maxTokens = promptVersion === 'paid' ? 12000 : 4000;
    let temperature = promptVersion === 'paid' ? 0.7 : 0.3;
    
    // If we're requesting a larger chunk size, adjust parameters
    if (chunkSize && chunkSize > 1000) {
      maxTokens = Math.min(24000, chunkSize * 3); // Scale up tokens but cap at 24k
      temperature = 0.5; // Middle ground temperature
      console.log(`Adjusted max tokens to ${maxTokens} for large response`);
    }
    
    try {
      // Set a longer timeout for large responses
      const timeout = promptVersion === 'paid' ? 55000 : 25000; // 55s for paid, 25s for free
      
      const response = await anthropic.messages.create({
        model,
        system: finalSystemPrompt,
        messages,
        max_tokens: maxTokens,
        temperature,
      });
      
      console.log("Received response from Anthropic API");
      console.log(`Response length: ${response.content[0].text.length} characters`);
      
      // Less strict validation - just check for basic elements
      const content = response.content[0].text;
      const hasRequiredFormat = 
        content.includes("#") && 
        (content.includes("PREMISE") || content.includes("Premise")) && 
        (content.includes("VICTIM") || content.includes("Victim")) && 
        (content.includes("CHARACTER") || content.includes("Characters"));
      
      if (!hasRequiredFormat && requireFormatValidation) {
        console.warn("Response does not follow required format! Response preview:", content.substring(0, 300));
        
        // We'll still return the response instead of throwing an error
        // This is to prevent failures when the format is slightly different
        console.log("Returning response anyway to avoid disrupting user experience");
      }

      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: response.content[0].text
          }
        }]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (apiError) {
      console.error("Error calling Anthropic API:", apiError);
      throw apiError;
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
