// src/services/mysteryPackageService.ts
import { supabase } from '@/lib/supabase';
import { generateFullMysteryInChunks, MysteryPreferences } from './aiService';

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
    onProgress?.(5, "Loading conversation data...");
    
    // 1. Fetch the original conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*, mystery_data, user_id")
      .eq("id", mysteryId)
      .single();
      
    if (convError) {
      console.error("Error fetching original conversation:", convError);
      throw new Error("Could not find the original conversation");
    }
    
    onProgress?.(15, "Preparing generation...");
    
    // 2. Extract theme and player count from conversation data or messages
    const mysteryData = conversation.mystery_data || {};
    
    // Create mystery preferences from conversation data
    const preferences: MysteryPreferences = {
      theme: mysteryData.theme || "Classic Mystery",
      playerCount: mysteryData.playerCount || 8,
      hasAccomplice: options?.hasAccomplice || mysteryData.hasAccomplice || false,
      scriptType: options?.scriptType || mysteryData.scriptType || "full",
      isPaid: true
    };
    
    console.log("Using mystery preferences:", preferences);
    onProgress?.(25, "Starting chunked generation...");
    
    // 3. Use the chunked generation approach with progress updates
    const packageContent = await generateFullMysteryInChunks(
      preferences,
      (progress) => {
        // Map the chunked progress (0-6 steps) to overall progress (25-85%)
        const progressPercent = 25 + Math.round((progress.completedSteps / progress.totalSteps) * 60);
        onProgress?.(progressPercent, progress.currentStep);
        
        console.log(`Generation progress: ${progressPercent}%, Step ${progress.completedSteps}/${progress.totalSteps}: ${progress.currentStep}`);
      }
    );
    
    onProgress?.(85, "Saving your mystery package...");
    
    // 4. Store the result in the mystery_packages table
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

    // 5. Update the conversation to mark it as completed
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
    
    // 6. Return the generated package content
    return packageContent;
  } catch (error) {
    console.error("Error generating complete package:", error);
    throw new Error(`Failed to generate the complete mystery package: ${error.message}`);
  }
};
