
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://esm.sh/@anthropic-ai/sdk";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key from environment variables
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!anthropicApiKey) {
      console.error("Missing Anthropic API key in environment variables");
      return new Response(
        JSON.stringify({ 
          error: "Configuration error: Missing Anthropic API key",
          message: "The Anthropic API key is not configured in the Edge Function environment",
          choices: [{
            message: {
              content: "API configuration error: The Anthropic API key is missing. Please contact support."
            }
          }]
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Client({ apiKey: anthropicApiKey });
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Received request body:", JSON.stringify({
        messageCount: requestBody.messages?.length || 0,
        promptVersion: requestBody.promptVersion
      }));
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request body",
          choices: [{
            message: {
              content: "Invalid request format. Please try again."
            }
          }]
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const { messages, promptVersion } = requestBody;
    
    // Validate request data
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("Missing or invalid messages in request:", messages);
      return new Response(
        JSON.stringify({ 
          error: "Missing or invalid messages parameter",
          choices: [{
            message: {
              content: "No messages provided. Please try again with a valid prompt."
            }
          }]
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Processing request with ${messages.length} messages and prompt version: ${promptVersion}`);

    // Get the appropriate system prompt based on promptVersion
    const systemPrompt = promptVersion === 'paid' 
      ? "You are an AI assistant that helps create detailed murder mystery party games. Since the user has purchased, provide complete character details, clues, and all game materials."
      : "You are an AI assistant that helps create murder mystery party games. Create an engaging storyline and suggest character ideas, but don't provide complete details as this is a preview.";

    // Format messages for Anthropic API
    const formattedMessages = messages.map(msg => {
      // Check if this is from our API structure or direct from the frontend
      if ('is_ai' in msg) {
        return {
          role: msg.is_ai ? "assistant" : "user",
          content: msg.content
        };
      } else if ('role' in msg) {
        // Already in the correct format
        return {
          role: msg.role,
          content: msg.content
        };
      } else {
        // Default to user if we can't determine
        console.warn("Unexpected message format:", msg);
        return {
          role: "user",
          content: String(msg.content || "")
        };
      }
    });
    
    console.log("Sending request to Anthropic API with formatted messages:", 
      JSON.stringify(formattedMessages.map(m => ({ role: m.role, contentPreview: m.content.substring(0, 30) + '...' }))));
    
    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      system: systemPrompt,
      messages: formattedMessages,
      max_tokens: 1000,
    });
    
    console.log("Received response from Anthropic API:", JSON.stringify({
      id: response.id,
      model: response.model,
      contentLength: response.content[0].text.length
    }));

    // Format response in expected structure (compatible with OpenAI format)
    const formattedResponse = {
      choices: [
        {
          message: {
            content: response.content[0].text
          }
        }
      ],
      model: response.model,
      id: response.id
    };

    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to get AI response", 
        details: error.message,
        choices: [{
          message: {
            content: `There was an error generating your murder mystery: ${error.message}. Please try again.`
          }
        }]
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
