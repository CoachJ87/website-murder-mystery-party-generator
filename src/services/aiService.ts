
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

export const getAIResponse = async (messages: ApiMessage[] | Message[], promptVersion: 'free' | 'paid', systemInstruction?: string): Promise<string> => {
  try {
    console.log(`DEBUG: Starting getAIResponse with ${messages.length} messages, promptVersion: ${promptVersion}`);
    
    if (systemInstruction) {
      console.log(`DEBUG: Using custom system instruction (first 100 chars): ${systemInstruction.substring(0, 100)}...`);
    }
    
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
    
    console.log("DEBUG: Calling mystery-ai Edge Function");

    let attempts = 0;
    const maxAttempts = 3; // Increased from 2 to 3
    let responseContent = '';
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`DEBUG: Attempt ${attempts} of ${maxAttempts}`);
      
      try {
        // Set a longer timeout for the function call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout
        
        const { data: functionData, error: functionError } = await supabase.functions.invoke('mystery-ai', {
          body: {
            messages: standardMessages,
            system: systemInstruction,
            promptVersion,
            requireFormatValidation: promptVersion === 'free', // Only enforce strict validation for free prompts
            chunkSize: 2000 // Send a hint that we want to generate a lot of content
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (functionError) {
          if (functionError.message?.includes('aborted') || functionError.message?.includes('timeout')) {
            console.error("DEBUG: Edge Function timeout:", functionError);
            throw new Error(`Edge Function timeout. This may indicate the response is too large.`);
          }
          
          console.error("DEBUG: Edge Function error:", functionError);
          throw new Error(`Edge Function error: ${functionError.message}`);
        }

        if (!functionData?.choices?.[0]?.message?.content) {
          console.error("DEBUG: Invalid response format from Edge Function");
          throw new Error("Invalid response format from Edge Function");
        }

        responseContent = functionData.choices[0].message.content;
        console.log(`DEBUG: Received response (length: ${responseContent.length})`);
        console.log(`DEBUG: Response preview (first 100 chars): ${responseContent.substring(0, 100)}...`);
        
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
          console.log("DEBUG: Response does not follow required format, retrying...");
          // If format is invalid and we haven't exhausted attempts, continue to next attempt
          
          // Add a stronger format instruction for the next attempt
          standardMessages.push({
            role: "user",
            content: "Please format your response exactly as requested, with sections for PREMISE, VICTIM, CHARACTER LIST, and MURDER METHOD. Make sure to use the '#' format for headings."
          });
        }
      } catch (error) {
        // For timeouts, we might want to break the request into smaller chunks
        if (error.message?.includes('timeout') && attempts >= maxAttempts) {
          console.error(`DEBUG: Repeated timeouts in getAIResponse. The response may be too large.`);
          
          // Try one last attempt with a smaller scope
          try {
            const { data: fallbackData } = await supabase.functions.invoke('mystery-ai', {
              body: {
                messages: [
                  ...standardMessages.slice(0, Math.min(5, standardMessages.length)), // Take just the first few messages
                  {
                    role: "user",
                    content: "Please provide a condensed version of the mystery package. Focus only on the most essential elements."
                  }
                ],
                system: systemInstruction,
                promptVersion,
                requireFormatValidation: false
              }
            });
            
            if (fallbackData?.choices?.[0]?.message?.content) {
              responseContent = fallbackData.choices[0].message.content;
              return responseContent + "\n\n[Note: This response was condensed due to size limitations.]";
            }
          } catch (fallbackError) {
            console.error("DEBUG: Even fallback request failed:", fallbackError);
          }
        }
        
        if (attempts >= maxAttempts) {
          console.error(`DEBUG: Error in getAIResponse (attempt ${attempts}): ${error.message}`);
          throw error;
        }
        
        console.warn(`DEBUG: Error in attempt ${attempts}, retrying: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait longer before retrying
      }
    }
    
    // If we've made it here, we've exhausted attempts but didn't get a valid response
    console.error("DEBUG: Failed to get a properly formatted response after multiple attempts");
    return responseContent || "Failed to generate content. Please try again.";
  } catch (error) {
    console.error(`DEBUG: Error in getAIResponse: ${error.message}`);
    throw error;
  }
};
