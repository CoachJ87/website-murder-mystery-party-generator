
// src/services/mysteryPackageService.ts
import { supabase } from '@/lib/supabase';
import { MysteryData } from '@/interfaces/mystery';

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

interface GenerationOptions {
  hasAccomplice: boolean;
  scriptType: 'full' | 'pointForm';
}

/**
 * Generates a complete murder mystery package based on an existing conversation
 */
export const generateCompletePackage = async (
  mysteryId: string,
  onProgress?: (progress: number, stage: string) => void,
  options?: GenerationOptions
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
    
    // 3. Format messages for the API call
    const messages: Message[] = messagesData.map(msg => ({
      is_ai: msg.is_ai,
      content: msg.content
    }));
    
    // 4. Add a transition prompt to connect the free and paid versions
    let transitionPrompt = `Generate the complete murder mystery package based on our conversation. Include:
      - Detailed host instructions with timeline
      - Character guides for all players
      - Clues and evidence descriptions
      - Full solution explanation
      - All printable game materials`;
      
    // Add options to the prompt if provided
    if (options) {
      if (options.hasAccomplice) {
        transitionPrompt += `
      - IMPORTANT: Include an accomplice mechanism where one player works with the murderer`;
      }
      
      if (options.scriptType === 'full') {
        transitionPrompt += `
      - IMPORTANT: Create full detailed scripts for characters`;
      } else if (options.scriptType === 'pointForm') {
        transitionPrompt += `
      - IMPORTANT: Create point form summary guides for characters instead of full scripts`;
      }
    }
    
    onProgress?.(35, "Generating your complete mystery package...");
    
    // 5. Use the Vercel API endpoint directly instead of the Edge Function
    const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';
    
    // Format messages for the API call
    const formattedMessages = messages.map(msg => ({
      role: msg.is_ai ? "assistant" : "user",
      content: msg.content
    }));
    
    // Add the transition prompt
    formattedMessages.push({
      role: "user",
      content: transitionPrompt
    });
    
    // Create the request body
    const requestBody = {
      messages: formattedMessages,
      system: "You are an expert murder mystery creator who specializes in detailed, comprehensive packages. Create a complete murder mystery game package with all necessary materials for hosting the event.",
      promptVersion: "paid",
      max_tokens: 12000
    };
    
    console.log("Sending request to Vercel API with message count:", formattedMessages.length);
    
    // Call the Vercel API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API returned status ${response.status}:`, errorText);
      throw new Error(`API returned status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data?.choices?.[0]?.message?.content) {
      console.error("Invalid response format from API:", data);
      throw new Error("Invalid response format from API");
    }
    
    const packageContent = data.choices[0].message.content;
    
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
  } catch (error) {
    console.error("Error generating complete package:", error);
    throw new Error(`Failed to generate the complete mystery package: ${error.message}`);
  }
};
