import { supabase } from "@/lib/supabase";

interface ApiMessage {
  role: string;
  content: string;
}

interface Message {
  is_ai?: boolean;
  content: string;
  role?: string;
}

export const getAIResponse = async (
  messages: ApiMessage[] | Message[], 
  promptVersion: 'free' | 'paid', 
  systemInstruction?: string, 
  testMode: boolean = false,
  onStream?: (chunk: string) => void
): Promise<string> => {
  try {
    console.log(`Starting getAIResponse with ${messages.length} messages, promptVersion: ${promptVersion}, testMode: ${testMode}`);
    
    if (systemInstruction) {
      console.log(`Using custom system instruction (first 100 chars): ${systemInstruction.substring(0, 100)}...`);
    }
    
    // Convert messages to a standard format first
    const standardMessages = messages.map(msg => {
      if ('is_ai' in msg) {
        return {
          role: msg.is_ai ? "assistant" : "user",
          content: msg.content || "" // Ensure content is never undefined
        };
      }
      return msg;
    })
    // Filter out messages with empty content to prevent API errors
    .filter(msg => msg.content && msg.content.trim() !== '');
    
    console.log(`Filtered to ${standardMessages.length} valid messages`);
    
    if (standardMessages.length === 0) {
      throw new Error("No valid messages to send to AI service");
    }

    // Create a simplified request payload for all attempts
    const requestPayload = {
      messages: standardMessages,
      system: systemInstruction,
      promptVersion,
      requireFormatValidation: promptVersion === 'free',
      testMode
    };

    // Track attempts for better error messages
    let attemptCount = 0;
    let lastError = null;

    // Direct invocation attempt - Most reliable when running in the same project
    try {
      attemptCount++;
      console.log("Attempting direct invocation of mystery-ai function");
      
      const { data, error } = await supabase.functions.invoke('mystery-ai', {
        body: requestPayload
      });
      
      if (error) {
        console.error("Direct invocation returned error:", error);
        throw new Error(`Supabase function error: ${error.message}`);
      }
      
      console.log("Response data from direct invocation:", data);
      
      if (data?.choices?.[0]?.message?.content) {
        console.log("Successfully got response from direct invocation");
        return data.choices[0].message.content;
      } else {
        console.warn("Invalid response format from direct invocation:", data);
        throw new Error("Invalid response format from direct invocation");
      }
    } catch (directError) {
      console.error("Error with direct invocation:", directError);
      lastError = directError;
      
      // Attempt 2: Use simple text fallback for essential functionality
      if (messages.length < 3) {
        // For initial messages, use a simple fallback that keeps the conversation going
        console.log("Using simple fallback for initial conversation");
        return "How many players do you want for your murder mystery?";
      } else {
        // For later messages, use a more detailed error message
        console.error("All attempts failed, using error fallback response");
        return `I apologize, but I'm having trouble connecting to my systems right now. Please try again in a moment, or try refreshing the page. (Error: ${lastError.message})`;
      }
    }
  } catch (error) {
    console.error(`Error in getAIResponse: ${error.message}`);
    return `I apologize, but I'm having trouble processing your request right now. Please try again in a moment. (Error: ${error.message})`;
  }
};

// New function to store generation state in local and session storage
export const saveGenerationState = (mysteryId: string, progressData: any) => {
  try {
    // Save to both localStorage and sessionStorage for redundancy
    localStorage.setItem(`mystery_generation_${mysteryId}`, JSON.stringify({
      ...progressData,
      lastUpdated: new Date().toISOString()
    }));
    
    sessionStorage.setItem(`mystery_generation_${mysteryId}`, JSON.stringify({
      ...progressData,
      lastUpdated: new Date().toISOString()
    }));
    
    return true;
  } catch (error) {
    console.error("Failed to save generation state:", error);
    return false;
  }
};

// New function to retrieve generation state from storage
export const getGenerationState = (mysteryId: string) => {
  try {
    // Try sessionStorage first (more likely to have the most recent data)
    const sessionData = sessionStorage.getItem(`mystery_generation_${mysteryId}`);
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    
    // Fall back to localStorage
    const localData = localStorage.getItem(`mystery_generation_${mysteryId}`);
    if (localData) {
      return JSON.parse(localData);
    }
    
    return null;
  } catch (error) {
    console.error("Failed to retrieve generation state:", error);
    return null;
  }
};

// New function to clear generation state
export const clearGenerationState = (mysteryId: string) => {
  try {
    localStorage.removeItem(`mystery_generation_${mysteryId}`);
    sessionStorage.removeItem(`mystery_generation_${mysteryId}`);
  } catch (error) {
    console.error("Failed to clear generation state:", error);
  }
};

// Add a function to send mystery data to the webhook for paid users
export const sendMysteryToWebhook = async (conversationId: string) => {
  try {
    console.log(`Sending mystery ${conversationId} to webhook for processing`);
    
    const { data, error } = await supabase.functions.invoke('mystery-webhook-trigger', {
      body: { conversationId }
    });
    
    if (error) {
      console.error("Error calling webhook trigger function:", error);
      throw new Error(`Failed to trigger webhook: ${error.message}`);
    }
    
    console.log("Webhook trigger response:", data);
    return data;
  } catch (error) {
    console.error("Error in sendMysteryToWebhook:", error);
    throw error;
  }
};

// Add a basic CORS-validation function to check if an endpoint is accessible
export const validateEndpointCors = async (url: string): Promise<boolean> => {
  try {
    // Use the cors-proxy to validate the CORS setup of the target URL
    const { data, error } = await supabase.functions.invoke('cors-proxy', {
      body: {
        url,
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,authorization'
        }
      }
    });
    
    if (error) {
      console.error("Error validating CORS:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("CORS validation error:", error);
    return false;
  }
};
