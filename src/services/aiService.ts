
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
    console.log(`DEBUG: Starting getAIResponse with ${messages.length} messages`);
    
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
        promptVersion
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

    return functionData.choices[0].message.content;
  } catch (error) {
    console.error(`DEBUG: Error in getAIResponse: ${error.message}`);
    throw error;
  }
};
