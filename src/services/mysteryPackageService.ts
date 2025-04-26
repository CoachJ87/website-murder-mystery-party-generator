
// src/services/mysteryPackageService.ts
import { getAIResponse } from '@/services/aiService';
import { supabase } from '@/lib/supabase';
import { MysteryData } from '@/interfaces/mystery';

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Status for tracking generation progress
export interface GenerationStatus {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100 percentage
  currentStep: string;
  error?: string;
}

/**
 * Generates a complete murder mystery package based on an existing conversation
 * using a chunked approach to avoid timeouts
 */
export const generateCompletePackage = async (mysteryId: string): Promise<string> => {
  try {
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
    
    // 4. Create an empty package record to track progress
    const { data: packageRecord, error: packageError } = await supabase
      .from("mystery_packages")
      .insert({
        conversation_id: mysteryId,
        content: "",
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (packageError) {
      console.error("Error creating package record:", packageError);
      throw new Error("Could not create package record");
    }
    
    // 5. Update conversation status to indicate generation has started
    await supabase
      .from("conversations")
      .update({ 
        has_complete_package: false,
        needs_package_generation: true
      })
      .eq("id", mysteryId);
    
    // 6. Generate the package in chunks
    const packageContent = await generatePackageInChunks(messages, mysteryId, packageRecord.id);
    
    // 7. Store the final result
    await supabase
      .from("conversations")
      .update({
        has_complete_package: true,
        needs_package_generation: false,
        package_generated_at: new Date().toISOString()
      })
      .eq("id", mysteryId);
    
    await supabase
      .from("mystery_packages")
      .update({
        content: packageContent,
        updated_at: new Date().toISOString()
      })
      .eq("id", packageRecord.id);
    
    return packageContent;
    
  } catch (error) {
    console.error("Error generating complete package:", error);
    
    // Update the conversation to indicate generation failed
    if (mysteryId) {
      await supabase
        .from("conversations")
        .update({ 
          needs_package_generation: false,
        })
        .eq("id", mysteryId);
    }
    
    throw new Error("Failed to generate the complete mystery package");
  }
};

/**
 * Check the status of an ongoing package generation
 */
export const getPackageGenerationStatus = async (mysteryId: string): Promise<GenerationStatus> => {
  try {
    // Check if there's an existing package for this mystery
    const { data: packageData, error: packageError } = await supabase
      .from("mystery_packages")
      .select("*")
      .eq("conversation_id", mysteryId)
      .single();
      
    if (packageError) {
      return {
        status: 'pending',
        progress: 0,
        currentStep: 'Not started'
      };
    }
    
    // Check conversation status
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("has_complete_package, needs_package_generation")
      .eq("id", mysteryId)
      .single();
      
    if (convError) {
      throw new Error("Could not check conversation status");
    }
    
    // Determine status
    if (conversation.has_complete_package) {
      return {
        status: 'completed',
        progress: 100,
        currentStep: 'Generation complete'
      };
    }
    
    if (conversation.needs_package_generation) {
      // We estimate progress based on content length - this is a rough approximation
      const progress = packageData && packageData.content 
        ? Math.min(95, Math.floor((packageData.content.length / 10000) * 20)) // Assume ~50K chars is complete
        : 10;
        
      return {
        status: 'in_progress',
        progress,
        currentStep: progress < 30 ? 'Generating host guide' : 
                     progress < 60 ? 'Generating character guides' : 
                     'Finalizing materials'
      };
    }
    
    return {
      status: 'pending',
      progress: 0,
      currentStep: 'Waiting to start'
    };
    
  } catch (error) {
    console.error("Error checking package generation status:", error);
    return {
      status: 'failed',
      progress: 0,
      currentStep: 'Error checking status',
      error: error.message
    };
  }
};

/**
 * Generate the package in logical chunks to avoid timeouts
 */
const generatePackageInChunks = async (
  messages: Message[], 
  mysteryId: string,
  packageId: string
): Promise<string> => {
  try {
    // 1. First chunk: Get the basic structure and host guide
    const hostGuidePrompt: Message = {
      is_ai: false,
      content: `Based on our previous conversation, generate the host guide section for this murder mystery package. Include setup instructions, timeline, and overview of the mystery.`
    };
    
    console.log("Generating host guide...");
    let hostGuide = await getAIResponse([...messages, hostGuidePrompt], "paid");
    
    // Save progress
    await updatePackageContent(packageId, hostGuide);
    await updateGenerationProgress(mysteryId, 30, "Generating character guides");
    
    // 2. Second chunk: Character guides
    const characterGuidesPrompt: Message = {
      is_ai: false,
      content: `Based on our previous conversation and the host guide you've created, now generate detailed character guides for each character in the mystery. Include background information, motives, secrets, and what they know about other characters.`
    };
    
    console.log("Generating character guides...");
    let characterGuides = await getAIResponse([...messages, { is_ai: true, content: hostGuide }, characterGuidesPrompt], "paid");
    
    // Save progress
    await updatePackageContent(packageId, hostGuide + "\n\n" + characterGuides);
    await updateGenerationProgress(mysteryId, 60, "Generating game materials");
    
    // 3. Final chunk: Game materials and evidence
    const materialsPrompt: Message = {
      is_ai: false,
      content: `Based on our previous conversation and the content you've created, now generate game materials including evidence cards, clue distribution, and any printable materials needed to host this murder mystery.`
    };
    
    console.log("Generating game materials...");
    let gameMaterials = await getAIResponse(
      [...messages, { is_ai: true, content: hostGuide + "\n\n" + characterGuides }, materialsPrompt], 
      "paid"
    );
    
    // Combine all sections
    const fullPackage = 
      hostGuide + "\n\n" +
      characterGuides + "\n\n" + 
      gameMaterials;
      
    // Save the complete package
    await updatePackageContent(packageId, fullPackage);
    await updateGenerationProgress(mysteryId, 100, "Generation complete");
    
    return fullPackage;
    
  } catch (error) {
    console.error("Error in chunked generation:", error);
    
    // If we hit an error but have partial content, try to get the partial content
    try {
      const { data: packageData } = await supabase
        .from("mystery_packages")
        .select("content")
        .eq("id", packageId)
        .single();
        
      if (packageData && packageData.content && packageData.content.length > 0) {
        console.log("Returning partial content after error");
        return packageData.content + "\n\n[Note: Generation was incomplete due to an error. You may want to regenerate this package.]";
      }
    } catch (partialError) {
      console.error("Error retrieving partial content:", partialError);
    }
    
    throw error;
  }
};

/**
 * Update the package content in the database
 */
const updatePackageContent = async (packageId: string, content: string): Promise<void> => {
  try {
    await supabase
      .from("mystery_packages")
      .update({ 
        content,
        updated_at: new Date().toISOString()
      })
      .eq("id", packageId);
  } catch (error) {
    console.error("Error updating package content:", error);
  }
};

/**
 * Update the generation progress
 */
const updateGenerationProgress = async (
  mysteryId: string, 
  progress: number, 
  currentStep: string
): Promise<void> => {
  try {
    await supabase
      .from("conversations")
      .update({ 
        mystery_data: {
          ...supabase.rpc('get_mystery_data', { conversation_id: mysteryId }),
          generationProgress: progress,
          generationStep: currentStep
        }
      })
      .eq("id", mysteryId);
  } catch (error) {
    console.error("Error updating generation progress:", error);
  }
};
