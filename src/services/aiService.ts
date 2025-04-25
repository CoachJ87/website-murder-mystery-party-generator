
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
    
    // Filter out any system messages
    const userAndAssistantMessages = standardMessages.filter(msg => msg.role !== 'system');
    
    // Create an enhanced system instruction that emphasizes not to ask about already provided information
    const baseSystemInstruction = systemInstruction || "Please format your response using Markdown syntax.";
    const enhancedSystemInstruction = `IMPORTANT: If the user has already specified preferences such as theme, player count, whether they want an accomplice, or script type, DO NOT ask about these again. Instead, create content based on these stated preferences. ${baseSystemInstruction}`;
    
    console.log("DEBUG: Calling mystery-ai Edge Function");

    const { data: functionData, error: functionError } = await supabase.functions.invoke('mystery-ai', {
      body: {
        messages: userAndAssistantMessages,
        system: enhancedSystemInstruction,
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
