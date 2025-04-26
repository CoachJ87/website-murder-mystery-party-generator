
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
    const maxAttempts = 2;
    let responseContent = '';
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`DEBUG: Attempt ${attempts} of ${maxAttempts}`);
      
      try {
        const { data: functionData, error: functionError } = await supabase.functions.invoke('mystery-ai', {
          body: {
            messages: standardMessages,
            system: systemInstruction,
            promptVersion,
            requireFormatValidation: true // Flag to enforce format validation
          }
        });

        if (functionError) {
          console.error("DEBUG: Edge Function error:", functionError);
          throw new Error(`Edge Function error: ${functionError.message}`);
        }

        if (!functionData?.choices?.[0]?.message?.content) {
          console.error("DEBUG: Invalid response format from Edge Function");
          throw new Error("Invalid response format from Edge Function");
        }

        responseContent = functionData.choices[0].message.content;
        console.log(`DEBUG: Received response (first 100 chars): ${responseContent.substring(0, 100)}...`);
        
        // Do a more relaxed validation - just check for some key sections
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
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          console.error(`DEBUG: Error in getAIResponse (attempt ${attempts}): ${error.message}`);
          throw error;
        }
        console.warn(`DEBUG: Error in attempt ${attempts}, retrying: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit before retrying
      }
    }
    
    // If we've made it here, we've exhausted attempts but didn't get a valid response
    console.error("DEBUG: Failed to get a properly formatted response after multiple attempts");
    return responseContent; // Return the last response we got, even if it doesn't match the format
  } catch (error) {
    console.error(`DEBUG: Error in getAIResponse: ${error.message}`);
    throw error;
  }
};
