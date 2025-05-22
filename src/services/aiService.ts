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

    console.log("Calling mystery-ai Edge Function");

    let attempts = 0;
    const maxAttempts = 3; // Increased to 3 for reliability
    let responseContent = '';
    
    // Estimate if this is likely a large request
    const isLargeRequest = promptVersion === 'paid' && standardMessages.some(msg => 
      msg.content.length > 5000 || 
      msg.content.includes("Host Guide") ||
      msg.content.includes("character guides") || 
      msg.content.includes("clues and evidence")
    );
    
    // Set appropriate chunk size with safe limits to avoid token issues
    // In test mode, use much smaller chunks
    const chunkSize = testMode ? 
      800 : // Small size for test mode
      isLargeRequest ? 1500 : 1000;
      
    console.log(`Request classified as ${isLargeRequest ? 'large' : 'standard'}, chunk size: ${chunkSize}, test mode: ${testMode}`);
    
    // Enable streaming if a stream handler is provided
    const useStreaming = !!onStream;
    
    // Flag to track if we should use the proxy as first resort
    let useProxyFirst = false;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Attempt ${attempts} of ${maxAttempts}`);
      
      try {
        // Set a longer timeout for the function call
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 60000); // 1 minute timeout
        
        // Always use smaller chunk sizes for more reliable responses
        const adjustedChunkSize = testMode ? 
          Math.min(1000, chunkSize) : // Keep test mode chunks small
          Math.min(2000, chunkSize * attempts);
          
        console.log(`Using chunk size: ${adjustedChunkSize} with streaming: ${useStreaming || isLargeRequest}`);
        
        // Prepare the request payload
        const requestPayload = {
          messages: standardMessages,
          system: systemInstruction,
          promptVersion,
          requireFormatValidation: promptVersion === 'free', 
          chunkSize: adjustedChunkSize,
          stream: useStreaming || isLargeRequest,
          testMode
        };
        
        let functionData;
        let functionError;
        
        // If CORS issues were detected previously or we've had multiple failures,
        // try using the cors-proxy first
        if (useProxyFirst) {
          console.log("Using cors-proxy as first resort due to previous CORS issues");
          
          try {
            const { data: proxyData, error: proxyError } = await supabase.functions.invoke('cors-proxy', {
              body: {
                url: `https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/mystery-ai`,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
                },
                body: requestPayload
              }
            });
            
            functionData = proxyData;
            functionError = proxyError;
            
            if (proxyError) {
              console.error("Proxy error:", proxyError);
              throw new Error(`Proxy error: ${proxyError.message}`);
            }
          } catch (proxyError) {
            console.error("Error using cors-proxy:", proxyError);
            throw proxyError;
          }
        } else {
          // Direct approach - use the Edge Function
          const result = await supabase.functions.invoke('mystery-ai', {
            body: requestPayload
          });
          
          functionData = result.data;
          functionError = result.error;
          
          if (functionError) {
            console.error("Edge Function error details:", functionError);
            
            // Check for CORS errors
            if (functionError.message?.includes('CORS') || 
                functionError.message?.includes('blocked by CORS policy') ||
                functionError.message?.includes('Failed to send')) {
              console.error("CORS error detected, will try cors-proxy fallback:", functionError);
              useProxyFirst = true;
              throw new Error("CORS policy error");
            }
            
            throw new Error(`Edge Function error: ${functionError.message}`);
          }
        }
          
        clearTimeout(timeoutId);

        if (!functionData) {
          console.error("Empty response from function");
          throw new Error("Empty response from function");
        }

        if (!functionData.choices?.[0]?.message?.content) {
          console.error("Invalid response format:", functionData);
          throw new Error("Invalid response format");
        }

        responseContent = functionData.choices[0].message.content;
        console.log(`Received response (length: ${responseContent.length})`);
        
        // For paid responses, we're more lenient with validation
        if (promptVersion === 'paid') {
          return responseContent; // Accept whatever we get for paid responses
        }
        
        // For free responses, do a relaxed validation - just check for some key sections
        const hasRequiredSections = 
          responseContent.includes("#") && 
          (responseContent.includes("PREMISE") || responseContent.includes("Premise")) && 
          (responseContent.includes("VICTIM") || responseContent.includes("Victim")) && 
          (responseContent.includes("CHARACTER") || responseContent.includes("Characters"));
        
        if (hasRequiredSections || attempts === maxAttempts) {
          // If format is valid or we've exhausted attempts, return the response
          return responseContent;
        } else {
          console.log("Response does not follow required format, retrying...");
          // If format is invalid and we haven't exhausted attempts, continue to next attempt
          
          // Add a stronger format instruction for the next attempt
          standardMessages.push({
            role: "user",
            content: "Please format your response exactly as requested, with sections for PREMISE, VICTIM, CHARACTER LIST, and MURDER METHOD. Make sure to use the '#' format for headings."
          });
        }
      } catch (error) {
        // If using the direct approach failed with CORS issue and we haven't tried proxy yet
        if (error.message?.includes('CORS') || 
            error.message?.includes('blocked by CORS policy') || 
            error.message?.includes('Failed to send')) {
          
          console.log("CORS issue detected, trying cors-proxy fallback");
          
          try {
            const { data: proxyData, error: proxyError } = await supabase.functions.invoke('cors-proxy', {
              body: {
                url: `https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/mystery-ai`,
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
                },
                body: {
                  messages: standardMessages,
                  system: systemInstruction,
                  promptVersion,
                  requireFormatValidation: promptVersion === 'free',
                  chunkSize: Math.min(2000, chunkSize * attempts),
                  testMode
                }
              }
            });
            
            if (proxyError) {
              console.error("Proxy error:", proxyError);
              throw proxyError;
            }
            
            if (!proxyData.choices?.[0]?.message?.content) {
              console.error("Invalid response format from proxy:", proxyData);
              throw new Error("Invalid response format from proxy");
            }
            
            responseContent = proxyData.choices[0].message.content;
            console.log(`Received proxy response (length: ${responseContent.length})`);
            
            // Set flag to use proxy first on next attempt since it worked
            useProxyFirst = true;
            
            return responseContent;
          } catch (proxyError) {
            console.error("Error with proxy fallback:", proxyError);
            throw proxyError;
          }
        }
        
        if (attempts >= maxAttempts) {
          console.error(`Error in getAIResponse (attempt ${attempts}): ${error.message}`);
          throw error;
        }
        
        console.warn(`Error in attempt ${attempts}, retrying: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Exponential backoff
      }
    }
    
    // If we've made it here, we've exhausted attempts but didn't get a valid response
    console.error("Failed to get a properly formatted response after multiple attempts");
    return responseContent || "Failed to generate content. Please try again.";
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
