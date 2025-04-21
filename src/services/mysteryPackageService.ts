// src/services/mysteryPackageService.ts
import { getAIResponse } from '@/services/aiService';
import { supabase } from '@/lib/supabase';
import { MysteryData } from '@/interfaces/mystery';

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

/**
 * Generates a complete murder mystery package based on an existing conversation
 */
export const generateCompletePackage = async (
  mysteryId: string,
  onProgress?: (progress: number, stage: string) => void
): Promise<string> => {
  try {
    // Update progress if the callback is provided
    onProgress?.(5, "Loading conversation history...");
    
    // 1. Fetch the original conversation
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("*, user_id")
      .eq("id", mysteryId)
      .single();
      
    if (convError) {
      console.error("Error fetching original conversation:", convError);
      throw new Error("Could not find the original conversation");
    }
    
    onProgress?.(15, "Processing conversation...");
    
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
    
    onProgress?.(25, "Creating your mystery package...");
    
    // 3. Format messages for the AI service
    const messages: Message[] = messagesData.map(msg => ({
      is_ai: msg.is_ai,
      content: msg.content
    }));
    
    // 4. Add a transition prompt to connect the free and paid versions
    const transitionPrompt: Message = {
      is_ai: false,
      content: `Generate the complete murder mystery package based on our conversation. Include:
      - Detailed host instructions with timeline
      - Character guides for all players
      - Clues and evidence descriptions
      - Full solution explanation
      - All printable game materials`
    };
    
    onProgress?.(35, "Generating your complete mystery package...");
    
    // 5. Call the AI service with the paid prompt version and high token limit
    // Try client-side generation to avoid edge function timeout
    try {
      const packageContent = await getAIResponse(
        [...messages, transitionPrompt], 
        "paid", 
        undefined,
        12000 // Very high token limit to avoid truncation
      );
      
      if (!packageContent) {
        throw new Error("Failed to generate mystery content");
      }
      
      onProgress?.(85, "Saving your mystery package...");
      
      // 6. Store the result in the mystery_packages table
      const { error: packageError } = await supabase
        .from("mystery_packages")
        .upsert({
          conversation_id: mysteryId,
          content: packageContent,
          created_at: new Date().toISOString()
        });
        
      if (packageError) {
        console.error("Error saving mystery package:", packageError);
        // Continue anyway to return content to user
      }

      // 7. Update the conversation to mark it as completed
      const { error: updateError } = await supabase
        .from("conversations")
        .update({
          has_complete_package: true,
          needs_package_generation: false,
          package_generated_at: new Date().toISOString()
        })
        .eq("id", mysteryId);
        
      if (updateError) {
        console.error("Error updating conversation status:", updateError);
      }
      
      onProgress?.(100, "Your mystery is ready!");
      
      // 8. Return the generated package content
      return packageContent;
    } catch (aiError) {
      console.error("Error during AI package generation:", aiError);
      throw new Error(`Generation failed: ${aiError.message}`);
    }
  } catch (error) {
    console.error("Error generating complete package:", error);
    throw new Error(`Failed to generate the complete mystery package: ${error.message}`);
  }
};
