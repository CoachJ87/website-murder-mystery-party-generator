
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Anthropic } from "https://esm.sh/@anthropic-ai/sdk@0.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests with careful logging
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    });
  }

  try {
    // Get API key and prompts from environment variables
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const freeMysteryPrompt = Deno.env.get('MYSTERY_FREE_PROMPT');
    const paidMysteryPrompt = Deno.env.get('MYSTERY_PAID_PROMPT');
    
    // Log prompt details (without revealing full content for security)
    console.log(`Free prompt loaded: ${freeMysteryPrompt ? 'YES (length: ' + freeMysteryPrompt.length + ')' : 'NO'}`);
    console.log(`Paid prompt loaded: ${paidMysteryPrompt ? 'YES (length: ' + paidMysteryPrompt.length + ')' : 'NO'}`);
    
    if (!anthropicApiKey) {
      console.error("Missing Anthropic API key in environment variables");
      return new Response(
        JSON.stringify({ 
          error: "Configuration error: Missing Anthropic API key",
          status: "error" 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Received request with data:", JSON.stringify({
        messageCount: requestBody.messages?.length || 0,
        promptVersion: requestBody.promptVersion,
        hasSystemOverride: !!requestBody.system
      }));
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const { messages, system, promptVersion } = requestBody;
    
    // Validate request data
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("Missing or invalid messages in request");
      return new Response(
        JSON.stringify({ error: "Missing or invalid messages parameter" }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Processing request with ${messages.length} messages and prompt version: ${promptVersion}`);

    // Determine system prompt
    let systemPrompt = system;
    
    if (!systemPrompt) {
      // If no system prompt was provided in the request, use the environment variable
      if (promptVersion === 'paid') {
        systemPrompt = paidMysteryPrompt || "You are an AI assistant that helps create detailed murder mystery party games. Provide complete character details, clues, and all game materials.";
        console.log("Using PAID prompt from environment (or default)");
      } else {
        systemPrompt = freeMysteryPrompt || "You are an AI assistant that helps create murder mystery party games. Create an engaging storyline and suggest character ideas, but don't provide complete details as this is a preview.";
        console.log("Using FREE prompt from environment (or default)");
      }
      
      // Log the first 50 characters of the prompt for debugging
      console.log("First 50 chars of system prompt:", systemPrompt.substring(0, 50));
    } else {
      console.log("Using CUSTOM system prompt from request");
    }

    try {
      console.log("Sending request to Anthropic API with system prompt length:", systemPrompt.length);
      
      const response = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        system: systemPrompt,
        messages: messages,
        max_tokens: 4000,
        temperature: 0.2, // Lower temperature for better format adherence
      });
      
      console.log("Received response from Anthropic API");
      
      // Validate response format
      const content = response.content[0].text;
      const hasExpectedFormat = 
        content.includes("# ") || 
        content.includes("## PREMISE") || 
        content.includes("## VICTIM") || 
        content.includes("## CHARACTER LIST");
      
      if (!hasExpectedFormat && !system) {
        console.warn("Response does not follow expected format!");
      } else {
        console.log("Response format validation passed");
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
      return new Response(
        JSON.stringify({ error: apiError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
