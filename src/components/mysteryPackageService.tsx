// src/services/mysteryPackageService.ts
import { getAIResponse } from './aiService';
import { supabase } from '@/lib/supabase';

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

/**
 * Generates a complete murder mystery package based on an existing conversation
 */
export const generateCompletePackage = async (mysteryId: string): Promise<string> => {
  try {
    // 1. Fetch the original conversation
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("mystery_id", mysteryId)
      .eq("prompt_version", "free")
      .single();
      
    if (convError) {
      console.error("Error fetching original conversation:", convError);
      throw new Error("Could not find the original conversation");
    }
    
    // 2. Fetch all messages from this conversation
    const { data: messagesData, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversations.id)
      .order("created_at", { ascending: true });
      
    if (msgError) {
      console.error("Error fetching messages:", msgError);
      throw new Error("Could not retrieve conversation messages");
    }
    
    // 3. Format messages for the AI service
    const messages: Message[] = messagesData.map(msg => ({
      is_ai: msg.is_ai,
      content: msg.content
    }));
    
    // 4. Add a transition prompt to connect the free and paid versions
    const transitionPrompt: Message = {
      is_ai: false,
      content: "Generate the complete murder mystery package based on our conversation above. Please include detailed character guides, host instructions, and all game materials."
    };
    
    // 5. Call the AI service with the paid prompt version
    const packageContent = await getAIResponse([...messages, transitionPrompt], "paid");
    
    // 6. Store the result in a new conversation
    const { data: newConv, error: newConvError } = await supabase
      .from("conversations")
      .insert({
        mystery_id: mysteryId,
        prompt_version: "paid",
        is_completed: true
      })
      .select()
      .single();
      
    if (newConvError) {
      console.error("Error creating new conversation:", newConvError);
      // Continue anyway to return the package to the user
    } else {
      // Store the messages
      await supabase
        .from("messages")
        .insert([
          {
            conversation_id: newConv.id,
            content: transitionPrompt.content,
            is_ai: false
          },
          {
            conversation_id: newConv.id,
            content: packageContent,
            is_ai: true
          }
        ]);
    }
    
    // 7. Return the generated package content
    return packageContent;
    
  } catch (error) {
    console.error("Error generating complete package:", error);
    throw new Error("Failed to generate the complete mystery package");
  }
};
