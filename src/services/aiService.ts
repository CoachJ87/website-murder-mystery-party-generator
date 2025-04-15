import { supabase } from "@/lib/supabase";

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log("Calling mystery-ai Edge Function with:", { messageCount: messages.length, promptVersion });
    
    const { data, error } = await supabase.functions.invoke('mystery-ai', {
      body: { messages, promptVersion }
    });

    if (error) {
      console.error("Error calling Edge Function:", error);
      throw new Error(`Edge Function error: ${error.message}`);
    }

    console.log("Edge Function response received:", data);
    
    // Extract the response content from the Anthropic API response
    if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
      console.log("Returning text from Edge Function");
      return data.content[0].text;
    }

    console.error("Invalid response format from Edge Function:", data);
    throw new Error("Invalid response format from Edge Function");
  } catch (error) {
    console.error("Error calling Edge Function:", error);
    throw error;
  }
};
