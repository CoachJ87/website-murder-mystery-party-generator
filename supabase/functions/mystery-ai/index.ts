import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Locale = 'en' | 'es' | 'fr' | 'de' | 'ko' | 'ja' | 'zh-cn' | 'nl' | 'da' | 'sv' | 'fi' | 'it' | 'pt';

function detectLocale(firstUserMsg: string): Locale {
  if (/[가-힣]/.test(firstUserMsg)) return 'ko';
  if (/[ひらがなカタカナ一-龯]/.test(firstUserMsg)) return 'ja';
  if (/[一-龯]/.test(firstUserMsg)) return 'zh-cn';
  if (/[ñáéíóúü¿¡]/.test(firstUserMsg)) return 'es';
  if (/[àâäéèêëïîôöùûüÿç]/.test(firstUserMsg)) return 'fr';
  if (/[äöüß]/.test(firstUserMsg)) return 'de';
  if (/[àèéìíîòóù]/.test(firstUserMsg)) return 'it';
  if (/[ãõáàâéêíóôúç]/.test(firstUserMsg)) return 'pt';
  if (/[æøåäöü]/.test(firstUserMsg)) {
    if (/[æø]/.test(firstUserMsg)) return 'da';
    if (/[ä]/.test(firstUserMsg)) return 'sv';
    return 'nl';
  }
  return 'en';
}

async function buildLabels(locale: Locale) {
  try {
    // Fetch from your deployed website
    const response = await fetch(`https://mysterymaker.party/locales/${locale}.json`);
    if (!response.ok) throw new Error('Failed to fetch locale');
    
    const localeData = await response.json();
    const sec = localeData.mysteryCreation.sections;
    return {
      premise: sec.premise,
      victim: sec.victim,
      characterList: sec.characterList,
      playersWord: sec.players,
      murderMethod: sec.murderMethod,
    };
  } catch (error) {
    console.error(`Failed to load locale ${locale}, falling back to English`);
    // Fallback to hardcoded English
    return {
      premise: 'PREMISE',
      victim: 'VICTIM',
      characterList: 'CHARACTER LIST',
      playersWord: 'PLAYERS',
      murderMethod: 'MURDER METHOD',
    };
  }
}

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

    // Get database prompt from environment secrets instead of database
    console.log("Available environment variables:", Object.keys(Deno.env.toObject()));
    console.log("MYSTERY_FREE_PROMPT exists:", !!Deno.env.get('MYSTERY_FREE_PROMPT'));
    console.log("MYSTERY_FREE_PROMPT length:", Deno.env.get('MYSTERY_FREE_PROMPT')?.length || 'undefined');
    let databasePrompt = Deno.env.get('MYSTERY_FREE_PROMPT');
    if (databasePrompt) {
      console.log("Retrieved database prompt from environment secrets");
    } else {
      console.log("No database prompt found in secrets, using fallback logic");
    }
    
    // Determine system prompt based on conversation state
    let systemPrompt = system;
    
    if (!systemPrompt) {
      // Default behavior for new conversations without custom system prompt
      console.log("No custom system prompt - analyzing conversation");
      
      // Check if this looks like a brand new conversation (1 message, likely asking for mystery creation)
      if (messages.length === 1) {
        const userMessage = messages[0].content || '';
        const looksLikeInitialRequest = userMessage.toLowerCase().includes('mystery') || 
                                       userMessage.toLowerCase().includes('murder') ||
                                       userMessage.toLowerCase().includes('design') ||
                                       userMessage.toLowerCase().includes('create') ||
                                       userMessage.toLowerCase().includes('craft') ||
                                       userMessage.toLowerCase().includes('gallery') ||
                                       userMessage.toLowerCase().includes('theme');
        
        if (looksLikeInitialRequest) {
          console.log("Detected complete mystery creation request - using database prompt");
          if (databasePrompt) {
            // Detect language and build labels for database prompt
            const firstUserMessage = messages.find(msg => msg.role === 'user')?.content || '';
            const detectedLocale = detectLocale(firstUserMessage);
            const labels = await buildLabels(detectedLocale);
            
            // Replace label placeholders in database prompt
            systemPrompt = databasePrompt
              .replace(/\{\{labels\.premise\}\}/g, labels.premise)
              .replace(/\{\{labels\.victim\}\}/g, labels.victim)
              .replace(/\{\{labels\.characterList\}\}/g, labels.characterList)
              .replace(/\{\{labels\.playersWord\}\}/g, labels.playersWord)
              .replace(/\{\{labels\.murderMethod\}\}/g, labels.murderMethod);
              
            console.log("Using database prompt with multilingual labels for complete request");
          }
        }
      }
      
      // If still no system prompt, use a default prompt
      if (!systemPrompt) {
        console.log("No specific prompt determined - using default mystery creation prompt");
        systemPrompt = `You are a helpful murder mystery creator. Help the user create an exciting murder mystery.`;
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