
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

    // Attempt 1: Next.js API proxy (most reliable for CORS)
    try {
      attemptCount++;
      console.log("Attempt 1: Using Next.js API proxy");
      
      const response = await fetch('/api/proxy-anthropic-cors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/mystery-ai`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          },
          data: requestPayload
        })
      });

      if (!response.ok) {
        console.warn(`Next.js proxy returned status ${response.status}`);
        throw new Error(`Next.js proxy returned status ${response.status}`);
      }

      const data = await response.json();
      
      // Check for error in the response data
      if (data.error) {
        console.warn("Next.js proxy returned error:", data.error);
        throw new Error(data.error);
      }
      
      if (!data.choices?.[0]?.message?.content) {
        console.warn("Invalid response format from Next.js proxy:", data);
        throw new Error("Invalid response format from Next.js proxy");
      }

      console.log("Successfully got response from Next.js proxy");
      return data.choices[0].message.content;

    } catch (proxyError) {
      console.error("Next.js proxy error:", proxyError);
      lastError = proxyError;
      
      // Attempt 2: Supabase cors-proxy
      try {
        attemptCount++;
        console.log("Attempt 2: Using Supabase cors-proxy function");
        
        const { data: proxyData, error: proxyError } = await supabase.functions.invoke('cors-proxy', {
          body: {
            url: `https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/mystery-ai`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
            },
            body: requestPayload
          }
        });
        
        if (proxyError) {
          console.warn("cors-proxy returned error:", proxyError);
          throw proxyError;
        }
        
        // Check for error in the response data
        if (proxyData?.error) {
          console.warn("cors-proxy response contains error:", proxyData.error);
          throw new Error(proxyData.error);
        }
        
        if (!proxyData?.choices?.[0]?.message?.content) {
          console.warn("Invalid response format from cors-proxy:", proxyData);
          throw new Error("Invalid response format from cors-proxy");
        }
        
        console.log("Successfully got response from cors-proxy");
        return proxyData.choices[0].message.content;
        
      } catch (corsProxyError) {
        console.error("Error with Supabase cors-proxy:", corsProxyError);
        lastError = corsProxyError;
        
        // Attempt 3: Direct invocation with minimal request
        try {
          attemptCount++;
          console.log("Attempt 3: Direct function invocation with simplified request");
          
          // Use a very minimal request to minimize chance of issues
          const simplifiedPayload = {
            messages: standardMessages.slice(-2), // Only use the last two messages
            system: systemInstruction || "You are a helpful assistant creating a murder mystery.",
            promptVersion: 'free',
            testMode: true // Force test mode for faster response
          };
          
          const { data: directData, error: directError } = await supabase.functions.invoke('mystery-ai', {
            body: simplifiedPayload
          });
          
          if (directError) {
            console.warn("Direct invocation returned error:", directError);
            throw directError;
          }
          
          // Check for error in the response data
          if (directData?.error) {
            console.warn("Direct invocation response contains error:", directData.error);
            throw new Error(directData.error);
          }
          
          if (directData?.choices?.[0]?.message?.content) {
            console.log("Successfully got response from direct invocation");
            return directData.choices[0].message.content;
          }
          
          // If we got a response but in wrong format, try to parse it
          if (typeof directData === 'object') {
            // Look for any property that might contain the AI response
            for (const key of Object.keys(directData)) {
              if (typeof directData[key] === 'string' && directData[key].length > 50) {
                console.log(`Found potential response in property "${key}"`);
                return directData[key];
              }
              
              if (typeof directData[key] === 'object' && directData[key]?.content) {
                console.log(`Found potential response object in property "${key}"`);
                return directData[key].content;
              }
            }
          }
          
          console.warn("Could not extract usable content from response:", directData);
          throw new Error("Could not extract usable content from response");
          
        } catch (finalError) {
          console.error("All attempts failed:", finalError);
          lastError = finalError;
          
          // Final attempt: Return a fallback response
          console.log("Using fallback response after all attempts failed");
          return `I'm having trouble connecting to my AI system right now. Please try again in a moment. This could be due to your internet connection or high server load. (Attempted ${attemptCount} different connection methods)`;
        }
      }
    }
  } catch (error) {
    console.error(`Error in getAIResponse: ${error.message}`);
    throw error;
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
