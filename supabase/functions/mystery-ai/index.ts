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
    const response = await fetch(`https://murder-mystery.party/locales/${locale}.json`);
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
      console.log("No custom system prompt - analyzing conversation for next step");
      
      // Analyze the conversation to determine what step we're at
      const conversationText = messages.map(msg => msg.content || '').join(' ').toLowerCase();
      const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()?.content?.toLowerCase() || '';
      
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
          console.log("Detected initial mystery creation request - asking for player count");
          systemPrompt = `You are a helpful murder mystery creator. Your first question should ALWAYS be: "How many players do you want for your murder mystery? (Choose between 4 and 32 players)"

Be conversational and ask only this question first. Do not generate any mystery content until you know the player count.

After getting the player count, proceed to ask about script preferences, then other details one at a time before creating the full mystery.`;
        }
      }
      
      // If still no system prompt, check conversation progress
      if (!systemPrompt) {
        // FIXED: Better player count detection - look for standalone numbers
        const playerCountNumbers = lastUserMessage.match(/\b(\d+)\b/g) || conversationText.match(/\b(\d+)\b/g) || [];
        const lastNumber = playerCountNumbers.length > 0 ? parseInt(playerCountNumbers[playerCountNumbers.length - 1]) : null;
        
        // Check if we have an invalid player count (including 3 which was mentioned)
        if (lastNumber !== null && (lastNumber < 4 || lastNumber > 32)) {
          console.log(`Detected invalid player count: ${lastNumber} - asking for correction`);
          systemPrompt = `The user provided ${lastNumber} players, which is outside the valid range. You must ask them to choose a number between 4 and 32 players. Be polite but clear about the requirement.

Say something like: "I need between 4 and 32 players for a murder mystery. Could you please choose a number in that range?"`;
        }
        
        // Check if we have a valid player count but no script preference
        const hasValidPlayerCount = conversationText.match(/\b([4-9]|[12][0-9]|3[0-2])\b/) && 
                                   (conversationText.includes('player') || conversationText.includes('people') || conversationText.includes('guest'));
        
        // FIXED: More specific script preference detection
        const hasScriptPreference = conversationText.includes('full script') || conversationText.includes('point form') || 
                                   conversationText.includes('summaries') || conversationText.includes('both formats') ||
                                   lastUserMessage.includes('full') || lastUserMessage.includes('point') ||
                                   lastUserMessage.includes('script') || lastUserMessage.includes('summary') ||
                                   lastUserMessage.includes('both');
        
        if (hasValidPlayerCount && !hasScriptPreference) {
          console.log("Has valid player count but no script preference - asking for script preference");
          systemPrompt = `Great! Now I need to know about character guidance format. Ask: "Would you prefer full scripts or point form summaries for character guidance? (You can also choose both if you'd like both formats)"

Only ask this question and wait for their response before proceeding.`;
        }
        
        // If we have both player count and script preference, use database prompt or create mystery
        if (hasValidPlayerCount && hasScriptPreference) {
          console.log("Has both player count and script preference - proceeding to mystery creation");
          
          if (databasePrompt) {
            console.log("Using environment prompt for mystery creation");
            systemPrompt = databasePrompt;
          } else {
            // Fallback to inline prompt with proper confirmation message
            console.log("Using fallback prompt for mystery creation");

            // Detect language from first user message
            const firstUserMessage = messages.find(msg => msg.role === 'user')?.content || '';
            const detectedLocale = detectLocale(firstUserMessage);
            const labels = await buildLabels(detectedLocale);

            // Extract theme from conversation if available
            let theme = "murder mystery";
            const themeMatch = conversationText.match(/(?:theme|setting|style).*?([a-z\s]+)/i);
            if (themeMatch) {
              theme = themeMatch[1].trim();
            }
            // Extract player count
            const playerCountMatch = conversationText.match(/\b([4-9]|[12][0-9]|3[0-2])\b/);
            const playerCount = playerCountMatch ? playerCountMatch[1] : "6";

            systemPrompt = `You are a murder mystery creator. The user has provided the necessary information. 

<language_instruction>
Always respond in the same language that the user writes to you.
</language_instruction>

Create a complete mystery with this format:

# "[CREATIVE TITLE]"

## ${labels.premise}
[2-3 paragraphs setting the scene, describing the event where the murder takes place, and creating dramatic tension]

## ${labels.victim}
**[Victim Name]** - [Vivid description of the victim, their role in the story, personality traits, and why they might have made enemies]

## ${labels.characterList} (${playerCount} ${labels.playersWord})
1. **[Character 1 Name]** - [Engaging one-sentence description including profession and connection to victim]
2. **[Character 2 Name]** - [Engaging one-sentence description including profession and connection to victim]
[Continue for all ${playerCount} characters]

## ${labels.murderMethod}
[Paragraph describing how the murder was committed, interesting details about the method, and what clues might be found]

IMPORTANT: Always end your response with: "Does this concept work for you? We can adjust any elements you'd like to change. Once you're satisfied with the concept, you can generate the complete mystery package with detailed character guides, host instructions, and game materials."`;
          }
        }
        
        // Fallback: ask for player count
        if (!systemPrompt) {
          console.log("Fallback - asking for player count");
          systemPrompt = `You are a helpful murder mystery creator. Your first question should ALWAYS be: "How many players do you want for your murder mystery? (Choose between 4 and 32 players)"

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