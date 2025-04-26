
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
    
    const { messages, system, promptVersion, requireFormatValidation } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Missing or invalid messages parameter");
    }

    console.log(`Processing request with ${messages.length} messages and prompt version: ${promptVersion}`);

    // Combine system prompts to ensure format is preserved
    let finalSystemPrompt = "";
    if (system) {
      finalSystemPrompt = system;
      console.log("Using provided system instruction");
    } else {
      finalSystemPrompt = promptVersion === 'paid' ? 
        (paidMysteryPrompt || "Default paid prompt") : 
        (freeMysteryPrompt || "Default free prompt");
      console.log(`Using ${promptVersion} prompt from environment`);
    }

    // Add format validation enforcement
    if (requireFormatValidation) {
      finalSystemPrompt += "\n\nIMPORTANT: You MUST strictly follow the OUTPUT FORMAT section above. Your response MUST include all required sections in the exact order specified.";
    }

    console.log("System prompt length:", finalSystemPrompt.length);
    
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        system: finalSystemPrompt,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.2, // Lower temperature for better format adherence
      });
      
      console.log("Received response from Anthropic API");
      
      // Validate response format
      const content = response.content[0].text;
      const hasRequiredFormat = 
        content.includes("# ") && 
        content.includes("## PREMISE") &&
        content.includes("## VICTIM") &&
        content.includes("## CHARACTER LIST");
      
      if (!hasRequiredFormat && requireFormatValidation) {
        console.warn("Response does not follow required format!");
        throw new Error("AI response did not follow the required format");
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
