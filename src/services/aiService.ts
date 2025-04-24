// src/services/aiService.ts
import { supabase } from "@/lib/supabase";

// Interface for messages sent to the API
interface ApiMessage {
  role: string;
  content: string;
}

// Local Message interface for compatibility
interface Message {
  is_ai?: boolean;
  content: string;
  role?: string;
}

// New interface for mystery preferences
export interface MysteryPreferences {
  theme: string;
  playerCount: number;
  isPaid?: boolean;
}

// Add this new function for the two-step mystery generation
export const generateMysteryPreview = async (preferences: MysteryPreferences): Promise<string> => {
  try {
    console.log("DEBUG: Starting generateMysteryPreview");
    
    // Step 1: Generate content
    const contentPrompt = `
      Based on a ${preferences.theme} murder mystery for ${preferences.playerCount} players:
      1. Create a creative title
      2. Write a compelling premise (2-3 paragraphs)
      3. Design a memorable victim with description
      4. List ${preferences.playerCount} characters with brief descriptions
      5. Describe the murder method

      FORMAT: Provide this as JSON with keys: title, theme, premise, victim, characters (array), murderMethod
    `;
    
    // Use your existing function for the first step
    const contentStep = await getAIResponse(
      [{ role: "user", content: contentPrompt }],
      'free',
      "Generate structured mystery content in JSON format only",
      2000
    );
    
    let mysteryContent;
    try {
      // Extract JSON from the response
      const jsonMatch = contentStep.match(/```json\n([\s\S]*)\n```/) || 
                       contentStep.match(/{[\s\S]*}/);
      
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : contentStep;
      mysteryContent = JSON.parse(jsonString);
    } catch (e) {
      console.error("DEBUG: Error parsing JSON response:", e);
      // Fallback to using the full response text if JSON parsing fails
      mysteryContent = {
        title: "Mystery Title",
        theme: preferences.theme,
        premise: contentStep.slice(0, 500),
        victim: "Mystery Victim",
        characters: Array(parseInt(preferences.playerCount.toString())).fill("Character"),
        murderMethod: "Unknown"
      };
    }
    
    // Step 2: Format the content
    const formattingPrompt = `
      Format this murder mystery content into the required preview layout:
      ${JSON.stringify(mysteryContent)}

      EXACT FORMAT REQUIRED:
      # "[TITLE]" - A [THEME] MURDER MYSTERY

      ## PREMISE
      [PREMISE]

      ## VICTIM
      [VICTIM]

      ## CHARACTER LIST ([PLAYER COUNT] PLAYERS)
      [NUMBERED CHARACTER LIST]

      ## MURDER METHOD
      [MURDER METHOD]

      ## UPGRADE TO FULL VERSION
      This is a preview of your custom murder mystery. Purchase the full package to receive detailed character guides, clues, and all game materials!
    `;
    
    // Use your existing function for the second step (with a smaller model via lower token count)
    const formattedMystery = await getAIResponse(
      [{ role: "user", content: formattingPrompt }],
      'free',
      "Format the provided content exactly according to the specified structure without modification",
      1000
    );
    
    return formattedMystery;
  } catch (error) {
    console.error(`DEBUG: Error in generateMysteryPreview: ${error.message}`);
    return `There was an error generating your mystery preview: ${error.message}. Please try again.`;
  }
};

// Keep your existing getAIResponse function unchanged
export const getAIResponse = async (
  messages: ApiMessage[] | Message[], 
  promptVersion: 'free' | 'paid', 
  systemInstruction?: string,
  maxTokens?: number
): Promise<string> => {
  // Your existing implementation remains unchanged
  try {
    console.log(`DEBUG: Starting getAIResponse with ${messages.length} messages`);
    console.log(`DEBUG: Prompt version: ${promptVersion}`);
    console.log(`DEBUG: System instruction preview:`, systemInstruction ? `${systemInstruction.substring(0, 100)}...` : "none");
    
    // Convert messages to a standard format first
    const standardMessages = messages.map(msg => {
      if ('is_ai' in msg) {
        return {
          role: msg.is_ai ? "assistant" : "user",
          content: msg.content
        };
      }
      return msg;
    });
    
    // IMPORTANT: Filter out any system messages - they need to be handled separately
    const userAndAssistantMessages = standardMessages.filter(msg => msg.role !== 'system');
    
    // Get system instruction (use the provided systemInstruction parameter or the default)
    const markdownInstruction = "Please format your response using Markdown syntax with headings (##, ###), lists (-, 1., 2.), bold (**), italic (*), and other formatting as appropriate to structure the information clearly. Do not use a title at the beginning of your response unless you are presenting a complete murder mystery concept with a title, premise, victim details, and character list.";
    
    // Create an enhanced system instruction that emphasizes not to ask about already provided information
    const baseSystemInstruction = systemInstruction || markdownInstruction;
    const enhancedSystemInstruction = `IMPORTANT: If the user has already specified preferences such as theme, player count, whether they want an accomplice, or script type, DO NOT ask about these again. Instead, create content based on these stated preferences. ${baseSystemInstruction}`;
    
    console.log(`DEBUG: Found ${userAndAssistantMessages.length} user/assistant messages`);
    console.log(`DEBUG: Enhanced system instruction (truncated): ${enhancedSystemInstruction.substring(0, 50)}...`);

    // Set default maxTokens based on prompt version if not specified
    const tokenLimit = maxTokens || (promptVersion === 'paid' ? 8000 : 1000);

    // First try using the Supabase Edge Function
    try {
      console.log("DEBUG: Attempting to use mystery-ai Edge Function");
      
      // Format the request for the Edge Function - only send user/assistant messages
      const edgeFunctionPayload = {
        messages: userAndAssistantMessages,
        system: enhancedSystemInstruction, // Send the enhanced system instruction
        promptVersion,
        max_tokens: tokenLimit
      };

      console.log("DEBUG: Edge Function payload structure:", {
        messageCount: edgeFunctionPayload.messages.length,
        hasSystemInstruction: !!edgeFunctionPayload.system,
        systemInstructionPreview: edgeFunctionPayload.system ? 
          edgeFunctionPayload.system.substring(0, 30) + '...' : 'none',
        maxTokens: edgeFunctionPayload.max_tokens
      });

      const { data: functionData, error: functionError } = await supabase.functions.invoke('mystery-ai', {
        body: edgeFunctionPayload
      });

      // Handle Edge Function response
      if (functionData) {
        // If the Edge Function indicates it's missing configuration, quietly fall back to Vercel API
        if (functionData.error && (
          functionData.error.includes("Configuration error") || 
          functionData.error.includes("Missing Anthropic API key") ||
          functionData.error.includes("TIMEOUT") ||
          functionData.error.includes("504")
        )) {
          console.log("DEBUG: Edge Function issue (timeout or config error), falling back to Vercel API");
          return await fallbackToVercelApi(userAndAssistantMessages, enhancedSystemInstruction, promptVersion, tokenLimit);
        }

        // For successful responses, return the content
        if (functionData.choices?.[0]?.message?.content) {
          return functionData.choices[0].message.content;
        }
      }

      // Handle explicit errors from the Edge Function
      if (functionError) {
        console.log("DEBUG: Edge Function error, falling back to Vercel API:", functionError);
        return await fallbackToVercelApi(userAndAssistantMessages, enhancedSystemInstruction, promptVersion, tokenLimit);
      }

      console.log("DEBUG: Invalid response format from Edge Function, falling back");
      return await fallbackToVercelApi(userAndAssistantMessages, enhancedSystemInstruction, promptVersion, tokenLimit);

    } catch (edgeFunctionError) {
      console.log("DEBUG: Edge Function exception, falling back to Vercel API:", edgeFunctionError);
      return await fallbackToVercelApi(userAndAssistantMessages, enhancedSystemInstruction, promptVersion, tokenLimit);
    }
  } catch (error) {
    console.error(`DEBUG: Error in getAIResponse: ${error.message}`);
    return `There was an error: ${error.message}. Please try again.`;
  }
};

const fallbackToVercelApi = async (
  userAndAssistantMessages: ApiMessage[],
  systemInstruction: string,
  promptVersion: 'free' | 'paid',
  maxTokens: number
): Promise<string> => {
  // Your existing implementation remains unchanged
  console.log("DEBUG: Using Vercel API fallback");
  const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';

  // Format request for the Vercel API - ensure system is sent as a separate parameter
  const requestBody = {
    messages: userAndAssistantMessages,
    system: systemInstruction, // Send the enhanced system instruction
    promptVersion,
    max_tokens: maxTokens
  };

  console.log("DEBUG: Sending to Vercel API:", {
    messageCount: requestBody.messages.length,
    systemInstructionPreview: requestBody.system.substring(0, 30) + '...',
    maxTokens: requestBody.max_tokens
  });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DEBUG: API returned status ${response.status}: ${errorText}`);
      throw new Error(`API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    throw new Error("Invalid response format from API");
  } catch (error) {
    console.error("DEBUG: Error in fallbackToVercelApi:", error);
    throw error;
  }
};
