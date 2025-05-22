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

    // First try the Next.js API proxy since it's more reliable for CORS
    try {
      console.log("Attempting to use Next.js API proxy first for better reliability");
      
      const response = await fetch('/api/proxy-anthropic-cors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: `https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/mystery-ai`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          },
          data: {
            messages: standardMessages,
            system: systemInstruction,
            promptVersion,
            requireFormatValidation: promptVersion === 'free',
            chunkSize: testMode ? 800 : 1000,
            testMode
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Next.js API proxy returned status ${response.status}`);
      }

      const data = await response.json();
      if (!data.choices?.[0]?.message?.content) {
        throw new Error("Invalid response format from Next.js API proxy");
      }

      return data.choices[0].message.content;

    } catch (proxyError) {
      console.error("Next.js proxy error:", proxyError);
      console.log("Falling back to Supabase function approaches");
      
      // Second attempt - try using supabase cors-proxy
      try {
        console.log("Attempting to use Supabase cors-proxy function");
        
        const { data: proxyData, error: proxyError } = await supabase.functions.invoke('cors-proxy', {
          body: {
            url: `https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/mystery-ai`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
            },
            body: {
              messages: standardMessages,
              system: systemInstruction,
              promptVersion,
              requireFormatValidation: promptVersion === 'free',
              chunkSize: testMode ? 800 : 1000,
              testMode
            }
          }
        });
        
        if (proxyError) {
          throw proxyError;
        }
        
        if (!proxyData?.choices?.[0]?.message?.content) {
          throw new Error("Invalid response format from cors-proxy");
        }
        
        return proxyData.choices[0].message.content;
        
      } catch (corsProxyError) {
        console.error("Error with Supabase cors-proxy:", corsProxyError);
        
        // Last resort - try direct invocation with lower expectations
        try {
          console.log("Final attempt - direct function invocation with simplified request");
          
          // Use a very minimal request to minimize CORS issues
          const { data: directData, error: directError } = await supabase.functions.invoke('mystery-ai', {
            body: {
              messages: standardMessages.slice(-2), // Only use the last two messages to keep it simple
              system: "You are a helpful assistant creating a murder mystery.",
              promptVersion: 'free',
              testMode: true // Force test mode for faster response
            }
          });
          
          if (directError) {
            throw directError;
          }
          
          if (directData?.choices?.[0]?.message?.content) {
            return directData.choices[0].message.content;
          }
          
          // If we got a response but in wrong format, try to parse it
          if (typeof directData === 'object') {
            // Look for any property that might contain the AI response
            for (const key of Object.keys(directData)) {
              if (typeof directData[key] === 'string' && directData[key].length > 50) {
                return directData[key];
              }
              
              if (typeof directData[key] === 'object' && directData[key]?.content) {
                return directData[key].content;
              }
            }
          }
          
          throw new Error("Could not extract usable content from response");
        } catch (finalError) {
          console.error("All attempts failed:", finalError);
          
          // Generate a fallback response as last resort
          return "I'm having trouble connecting to my AI service right now. Please try again in a moment. If this persists, you might want to try refreshing the page or contact support.";
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
