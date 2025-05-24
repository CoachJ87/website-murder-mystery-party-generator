

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Comprehensive CORS headers to handle all possible browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false',
  'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
};

serve(async (req) => {
  // Log all incoming requests for debugging
  console.log("=== Incoming Request ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests with comprehensive logging
  if (req.method === 'OPTIONS') {
    console.log("CORS preflight request received");
    const response = new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
    console.log("CORS preflight response headers:", Object.fromEntries(response.headers.entries()));
    return response;
  }

  // Add CORS headers to all responses
  const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    console.log("Processing request with mystery-ai edge function");
    
    const requestBody = await req.json();
    console.log("Request body received:", JSON.stringify(requestBody, null, 2));
    
    const { messages, system, promptVersion } = requestBody;
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }
    
    console.log(`Processing request with ${messages.length} messages`);
    console.log("Custom system prompt provided:", !!system);
    
    // Get the Anthropic API key
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment variables');
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    
    // Determine system prompt based on conversation state
    let systemPrompt = system;
    
    if (!systemPrompt) {
      // Default behavior for new conversations without custom system prompt
      console.log("No custom system prompt - using default player count question");
      
      // Check if this looks like a brand new conversation (1 message, likely asking for mystery creation)
      if (messages.length === 1) {
        const userMessage = messages[0].content || '';
        const looksLikeInitialRequest = userMessage.toLowerCase().includes('mystery') || 
                                       userMessage.toLowerCase().includes('murder') ||
                                       userMessage.toLowerCase().includes('design') ||
                                       userMessage.toLowerCase().includes('create') ||
                                       userMessage.toLowerCase().includes('craft');
        
        if (looksLikeInitialRequest) {
          console.log("Detected initial mystery creation request - asking for player count");
          systemPrompt = `You are a helpful murder mystery creator. Your first question should ALWAYS be: "How many players do you want for your murder mystery?"

Be conversational and ask only this question first. Do not generate any mystery content until you know the player count.

After getting the player count, proceed to ask about theme, then other details one at a time before creating the full mystery.`;
        }
      }
      
      // If still no system prompt, check if conversation has progressed enough
      if (!systemPrompt) {
        const hasPlayerCount = messages.some(msg => 
          msg.content && (
            msg.content.includes('player') || 
            msg.content.match(/\d+/) || 
            msg.content.includes('people') || 
            msg.content.includes('guests')
          )
        );
        
        if (hasPlayerCount) {
          console.log("Detected player count in conversation - using creation mode");
          systemPrompt = `You are a murder mystery creator. Help the user create an engaging murder mystery step by step. Ask for details one at a time: theme, setting, victim details, etc. Once you have enough information, create a complete mystery outline.`;
        } else {
          console.log("No player count detected - asking for it");
          systemPrompt = `You are a helpful murder mystery creator. Your first question should ALWAYS be: "How many players do you want for your murder mystery?"

Be conversational and ask only this question first. Do not generate any mystery content until you know the player count.`;
        }
      }
    }
    
    console.log("Final system prompt being used:", systemPrompt.substring(0, 200) + "...");
    
    // Format messages for Anthropic API
    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content || ''
    })).filter(msg => msg.content.trim() !== '');
    
    console.log("Formatted messages for Anthropic:", anthropicMessages.length, "messages");
    
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        system: systemPrompt,
        messages: anthropicMessages,
        temperature: 0.7
      })
    });
    
    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error(`Anthropic API error: ${anthropicResponse.status} ${errorText}`);
      throw new Error(`Anthropic API error: ${anthropicResponse.status} ${errorText}`);
    }
    
    const data = await anthropicResponse.json();
    console.log("Anthropic API response received, content length:", data.content?.[0]?.text?.length || 0);
    
    const assistantMessage = data.content?.[0]?.text;
    if (!assistantMessage) {
      throw new Error('No content in response from Anthropic API');
    }
    
    console.log("Returning successful response");
    
    // Return in the format expected by the frontend
    const successResponse = new Response(JSON.stringify({
      choices: [{
        message: {
          content: assistantMessage,
          role: "assistant"
        }
      }]
    }), {
      headers: responseHeaders
    });
    
    console.log("Success response headers:", Object.fromEntries(successResponse.headers.entries()));
    return successResponse;
    
  } catch (error) {
    console.error('Error in mystery-ai function:', error);
    
    // Return a proper error response that the frontend can handle
    const errorResponse = new Response(JSON.stringify({ 
      error: error.message,
      choices: [{
        message: {
          content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
          role: "assistant"
        }
      }]
    }), {
      status: 200, // Return 200 so the frontend doesn't treat it as a failed request
      headers: responseHeaders
    });
    
    console.log("Error response headers:", Object.fromEntries(errorResponse.headers.entries()));
    return errorResponse;
  }
});

