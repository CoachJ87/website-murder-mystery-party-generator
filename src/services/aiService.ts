import { supabase } from "@/lib/supabase";

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log("Calling mystery-ai Edge Function with:", { messages: messages.length, promptVersion });
    
    const { data, error } = await supabase.functions.invoke('mystery-ai', {
      body: { messages, promptVersion }
    });

    if (error) {
      console.error("Error calling Edge Function:", error);
      throw new Error(`Edge Function error: ${error.message}`);
    }

    console.log("Edge Function response:", data);
    
    // Extract the response content from the Anthropic API response
    if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
      return data.content[0].text;
    }

    return "I couldn't generate a proper response. Please try again.";
  } catch (error) {
    console.error("Error calling Edge Function:", error);
    throw error;
  }
};
