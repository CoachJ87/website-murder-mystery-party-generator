

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin, referer, user-agent',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    console.log("Processing request with mystery-ai edge function");
    
    const requestBody = await req.json();
    console.log("Request body received:", JSON.stringify(requestBody, null, 2));
    
    const { messages, system, promptVersion } = requestBody;
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }
    
    console.log(`Processing request with ${messages.length} messages`);
    
    // Get the Anthropic API key
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment variables');
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    
    // Use provided system instruction or create default
    let systemPrompt = system || `You are a helpful murder mystery creator. Your first question should ALWAYS be: "How many players do you want for your murder mystery?"

Be conversational and ask only this question first. Do not generate any mystery content until you know the player count.

After getting the player count, proceed to ask about theme, then other details one at a time before creating the full mystery.`;
    
    // If this is not the first message, check if we have player count info
    if (messages.length > 1) {
      const hasPlayerCount = messages.some(msg => 
        msg.content && (
          msg.content.includes('player') || 
          msg.content.match(/\d+/) || 
          msg.content.includes('people') || 
          msg.content.includes('guests')
        )
      );
      
      if (hasPlayerCount && !system) {
        systemPrompt = `You are a murder mystery creator. Help the user create an engaging murder mystery step by step. Ask for details one at a time: theme, setting, victim details, etc. Once you have enough information, create a complete mystery outline.`;
      }
    }
    
    console.log("System prompt being used:", systemPrompt.substring(0, 200) + "...");
    
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
    
    // Return a proper error response that the frontend can handle
    return new Response(JSON.stringify({ 
      error: error.message,
      choices: [{
        message: {
          content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
          role: "assistant"
        }
      }]
    }), {
      status: 200, // Return 200 so the frontend doesn't treat it as a failed request
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

