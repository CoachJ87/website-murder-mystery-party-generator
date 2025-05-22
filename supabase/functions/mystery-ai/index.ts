
// Import required modules from Deno standard library and external packages
import "https://deno.land/x/xhr@0.1.0/mod.ts"; // Polyfill for XMLHttpRequest
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Anthropic } from 'npm:@anthropic-ai/sdk';

// Initialize the Anthropic client with the API key from environment variables
const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

// Define CORS headers for cross-origin requests - using more permissive settings
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': '*', // Allow all headers
  'Access-Control-Max-Age': '86400',
};

// Define the request handler function
serve(async (req) => {
  console.log("Processing request with mystery-ai edge function");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  try {
    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Successfully parsed request body");
    } catch (jsonError) {
      console.error("Failed to parse request JSON:", jsonError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Destructure the request body with defaults
    const {
      messages,
      system = null,
      promptVersion = 'free',
      requireFormatValidation = false,
      chunkSize = 1000,
      stream = false,
      testMode = false
    } = requestBody;

    console.log(`Processing request with ${messages?.length || 0} messages and prompt version: ${promptVersion}`);
    
    // Validate if messages exist and are in the correct format
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("No messages provided or invalid format");
      return new Response(
        JSON.stringify({ error: "No messages provided or invalid format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the system message with instructions based on provided system or default
    let systemMessage;
    
    if (system) {
      console.log("Using provided system instruction");
      console.log(`System prompt length: ${system.length}`);
      console.log(`System prompt preview: ${system.substring(0, 50)}...`);
      systemMessage = system;
      
      // Add explicit instruction to answer one question at a time 
      if (!systemMessage.includes("ANSWER ONE QUESTION AT A TIME")) {
        systemMessage += "\n\nIMPORTANT: ANSWER ONE QUESTION AT A TIME. DO NOT BATCH OR COMBINE RESPONSES TO MULTIPLE QUESTIONS.";
      }
    } else {
      // Default system message if none provided
      systemMessage = "You are a helpful mystery writer. Your job is to help the user create an exciting murder mystery game. ALWAYS answer ONE QUESTION AT A TIME. NEVER give multiple responses together.";
      
      if (promptVersion === 'free') {
        systemMessage += " You should follow the OUTPUT FORMAT structure exactly.";
      }
    }

    // Add stronger instruction to prevent batching responses
    systemMessage += "\n\nVERY IMPORTANT INSTRUCTION: Never answer more than one user question in a single response. If the user asks multiple questions, just answer the first one. NEVER batch answers to multiple questions.";

    // Prepare the model and max tokens based on the prompt version and test mode
    let model = "claude-3-opus-20240229";
    let maxTokens = testMode ? 1000 : 2000;
    
    // Log the model and max tokens
    console.log(`Using model: ${model} with max tokens: ${maxTokens}`);

    // Clean and standardize messages for the API
    const standardizedMessages = messages.map(msg => {
      // Check if the message has is_ai flag or role
      if (msg.is_ai !== undefined) {
        return {
          role: msg.is_ai ? "assistant" : "user",
          content: msg.content || ''
        };
      } else {
        return {
          role: msg.role || 'user',
          content: msg.content || ''
        };
      }
    }).filter(msg => msg.content && msg.content.trim() !== '');
    
    console.log("Standardized messages:", JSON.stringify(standardizedMessages.slice(0, 2))); // Log first few messages for debugging

    // Make the API call to Anthropic with enhanced error handling
    try {
      console.log("Starting Anthropic API call");
      
      let options = {
        model: model,
        max_tokens: maxTokens,
        system: systemMessage,
        messages: standardizedMessages,
        temperature: 0.7
      };
      
      console.log("Calling Anthropic API with options:", JSON.stringify({
        model: options.model,
        max_tokens: options.max_tokens,
        system_length: options.system.length,
        messages_count: options.messages.length,
        temperature: options.temperature
      }));
      
      // Set a reasonable timeout for the API call
      const timeoutMs = 45000; // 45 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Anthropic API request timed out")), timeoutMs);
      });
      
      // Race between the API call and the timeout
      const response = await Promise.race([
        anthropic.messages.create(options),
        timeoutPromise
      ]) as any; // Type assertion needed due to race
      
      console.log("Received response from Anthropic API");
      console.log(`Response length: ${response.content[0].text.length} characters`);

      // Format the response as expected by the client
      const formattedResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: response.content[0].text
            }
          }
        ]
      };

      // Return the response to the client
      return new Response(
        JSON.stringify(formattedResponse),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } catch (apiError) {
      console.error(`Anthropic API error: ${apiError.message}`);
      
      // Create a detailed error response
      let errorDetail = {
        message: apiError.message,
        type: apiError.constructor.name,
        status: apiError.status || 'Unknown'
      };
      
      console.error("API Error details:", JSON.stringify(errorDetail));
      
      // Generate a simple fallback response for common errors
      if (apiError.message?.includes('timeout') || apiError.message?.includes('aborted')) {
        console.log("Generating simple fallback response due to timeout");
        
        // Create a simple fallback response
        const fallbackResponse = {
          choices: [
            {
              message: {
                role: "assistant",
                content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or try breaking your question into smaller parts."
              }
            }
          ]
        };
        
        return new Response(
          JSON.stringify(fallbackResponse),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
      
      // More detailed error for Anthropic-specific issues
      return new Response(
        JSON.stringify({ 
          error: `Anthropic API error: ${apiError.message}`,
          details: errorDetail
        }),
        { 
          status: 502, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
  } catch (error) {
    // Log and handle general errors with more detailed information
    console.error(`Error in mystery-ai edge function: ${error.message}`);
    console.error(`Error type: ${error.constructor.name}`);
    
    // Return a generalized error response that includes helpful information
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        type: error.constructor.name,
        suggestion: "This may be a temporary issue. Please try again with a simpler request or wait a moment."
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
