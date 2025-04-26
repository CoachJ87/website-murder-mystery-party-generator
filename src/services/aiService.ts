
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

    const { data: functionData, error: functionError } = await supabase.functions.invoke('mystery-ai', {
      body: {
        messages: standardMessages,
        system: systemInstruction,
        promptVersion,
        requireFormatValidation: true // New flag to enforce format validation
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

    const responseContent = functionData.choices[0].message.content;
    console.log(`DEBUG: Received response (first 100 chars): ${responseContent.substring(0, 100)}...`);
    
    // Validate response format
    const hasRequiredSections = 
      responseContent.includes("# ") && 
      responseContent.includes("## PREMISE") &&
      responseContent.includes("## VICTIM") &&
      responseContent.includes("## CHARACTER LIST");
    
    if (!hasRequiredSections) {
      console.error("DEBUG: Response does not follow required format, retrying...");
      // You could implement a retry mechanism here if needed
      throw new Error("AI response did not follow the required format");
    }
    
    return responseContent;
  } catch (error) {
    console.error(`DEBUG: Error in getAIResponse: ${error.message}`);
    throw error;
  }
};
