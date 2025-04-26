
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
  sections?: {
    hostGuide: boolean;
    characters: boolean;
    clues: boolean;
    solution: boolean;
  };
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
    const { data: existingPackage } = await supabase
      .from("mystery_packages")
      .select("id")
      .eq("conversation_id", mysteryId)
      .maybeSingle();
      
    let packageId: string;
    
    if (existingPackage) {
      packageId = existingPackage.id;
      
      // Update the generation status
      await supabase
        .from("mystery_packages")
        .update({
          generation_status: {
            status: 'in_progress',
            progress: 0,
            currentStep: 'Starting generation',
            sections: {
              hostGuide: false,
              characters: false,
              clues: false,
              solution: false
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
    } else {
      // Create a new package record
      const { data: packageRecord, error: packageError } = await supabase
        .from("mystery_packages")
        .insert({
          conversation_id: mysteryId,
          content: "",
          generation_status: {
            status: 'in_progress',
            progress: 0,
            currentStep: 'Starting generation',
            sections: {
              hostGuide: false,
              characters: false,
              clues: false,
              solution: false
            }
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (packageError) {
        console.error("Error creating package record:", packageError);
        throw new Error("Could not create package record");
      }
      
      packageId = packageRecord.id;
    }
    
    // 5. Update conversation status to indicate generation has started
    await supabase
      .from("conversations")
      .update({ 
        has_complete_package: false,
        needs_package_generation: true,
        display_status: "purchased"
      })
      .eq("id", mysteryId);
    
    // 6. Generate the package in chunks with retry logic
    const packageContent = await generatePackageInChunks(messages, mysteryId, packageId);
    
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
        generation_status: {
          status: 'completed',
          progress: 100,
          currentStep: 'Generation complete',
          sections: {
            hostGuide: true,
            characters: true,
            clues: true,
            solution: true
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq("id", packageId);
    
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
      .select("generation_status, content")
      .eq("conversation_id", mysteryId)
      .single();
      
    if (packageError) {
      return {
        status: 'pending',
        progress: 0,
        currentStep: 'Not started',
        sections: {
          hostGuide: false,
          characters: false,
          clues: false,
          solution: false
        }
      };
    }
    
    if (packageData.generation_status) {
      return packageData.generation_status as GenerationStatus;
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
        currentStep: 'Generation complete',
        sections: {
          hostGuide: true,
          characters: true,
          clues: true,
          solution: true
        }
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
                     'Finalizing materials',
        sections: {
          hostGuide: progress >= 25,
          characters: progress >= 50,
          clues: progress >= 75,
          solution: progress >= 90
        }
      };
    }
    
    return {
      status: 'pending',
      progress: 0,
      currentStep: 'Waiting to start',
      sections: {
        hostGuide: false,
        characters: false,
        clues: false,
        solution: false
      }
    };
    
  } catch (error) {
    console.error("Error checking package generation status:", error);
    return {
      status: 'failed',
      progress: 0,
      currentStep: 'Error checking status',
      error: error.message,
      sections: {
        hostGuide: false,
        characters: false,
        clues: false,
        solution: false
      }
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
  let fullPackage = "";
  const maxRetries = 3;
  
  try {
    // 1. First chunk: Get the basic structure and host guide
    const hostGuidePrompt: Message = {
      is_ai: false,
      content: `Based on our previous conversation, generate the host guide section for this murder mystery package. Include setup instructions, timeline, and overview of the mystery.`
    };
    
    console.log("Generating host guide...");
    let hostGuide = "";
    let hostGuideRetries = 0;
    
    while (hostGuideRetries < maxRetries) {
      try {
        hostGuide = await getAIResponse([...messages, hostGuidePrompt], "paid");
        
        // Update progress and partial content
        fullPackage += hostGuide;
        await updatePackageContent(packageId, fullPackage);
        await updateGenerationStatus(mysteryId, packageId, 25, "Generating character guides", {
          hostGuide: true,
          characters: false,
          clues: false,
          solution: false
        });
        
        break;
      } catch (error) {
        hostGuideRetries++;
        console.error(`Host guide generation attempt ${hostGuideRetries} failed:`, error);
        
        if (hostGuideRetries >= maxRetries) {
          console.error("Failed to generate host guide after multiple attempts");
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // 2. Second chunk: Character guides
    const characterGuidesPrompt: Message = {
      is_ai: false,
      content: `Based on our previous conversation and the host guide you've created, now generate detailed character guides for each character in the mystery. Include background information, motives, secrets, and what they know about other characters.`
    };
    
    console.log("Generating character guides...");
    let characterGuides = "";
    let characterGuideRetries = 0;
    
    while (characterGuideRetries < maxRetries) {
      try {
        characterGuides = await getAIResponse(
          [...messages, { is_ai: true, content: hostGuide }, characterGuidesPrompt], 
          "paid"
        );
        
        // Update progress and partial content
        fullPackage += "\n\n" + characterGuides;
        await updatePackageContent(packageId, fullPackage);
        await updateGenerationStatus(mysteryId, packageId, 50, "Generating clues and evidence", {
          hostGuide: true,
          characters: true,
          clues: false,
          solution: false
        });
        
        break;
      } catch (error) {
        characterGuideRetries++;
        console.error(`Character guides generation attempt ${characterGuideRetries} failed:`, error);
        
        if (characterGuideRetries >= maxRetries) {
          console.error("Failed to generate character guides after multiple attempts");
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // 3. Third chunk: Clues and evidence
    const cluesPrompt: Message = {
      is_ai: false,
      content: `Based on our previous conversation and the content you've created, now generate clues, evidence, and props for this murder mystery. Include details about how and when each clue is discovered.`
    };
    
    console.log("Generating clues and evidence...");
    let cluesAndEvidence = "";
    let cluesRetries = 0;
    
    while (cluesRetries < maxRetries) {
      try {
        cluesAndEvidence = await getAIResponse(
          [...messages, 
           { is_ai: true, content: hostGuide }, 
           { is_ai: true, content: characterGuides },
           cluesPrompt], 
          "paid"
        );
        
        // Update progress and partial content
        fullPackage += "\n\n" + cluesAndEvidence;
        await updatePackageContent(packageId, fullPackage);
        await updateGenerationStatus(mysteryId, packageId, 75, "Generating solution", {
          hostGuide: true,
          characters: true,
          clues: true,
          solution: false
        });
        
        break;
      } catch (error) {
        cluesRetries++;
        console.error(`Clues and evidence generation attempt ${cluesRetries} failed:`, error);
        
        if (cluesRetries >= maxRetries) {
          console.error("Failed to generate clues and evidence after multiple attempts");
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // 4. Final chunk: Solution and printable materials
    const solutionPrompt: Message = {
      is_ai: false,
      content: `Based on our previous conversation and the content you've created, now generate the solution section that explains how the murder was committed, with all key evidence pointing to the killer. Also include any final printable materials needed.`
    };
    
    console.log("Generating solution...");
    let solution = "";
    let solutionRetries = 0;
    
    while (solutionRetries < maxRetries) {
      try {
        solution = await getAIResponse(
          [...messages, 
           { is_ai: true, content: hostGuide }, 
           { is_ai: true, content: characterGuides },
           { is_ai: true, content: cluesAndEvidence },
           solutionPrompt], 
          "paid"
        );
        
        // Update final package
        fullPackage += "\n\n" + solution;
        await updatePackageContent(packageId, fullPackage);
        await updateGenerationStatus(mysteryId, packageId, 100, "Generation complete", {
          hostGuide: true,
          characters: true,
          clues: true,
          solution: true
        });
        
        break;
      } catch (error) {
        solutionRetries++;
        console.error(`Solution generation attempt ${solutionRetries} failed:`, error);
        
        if (solutionRetries >= maxRetries) {
          console.error("Failed to generate solution after multiple attempts");
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    return fullPackage;
    
  } catch (error) {
    console.error("Error in chunked generation:", error);
    
    // If we hit an error but have partial content, update status and return partial content
    if (fullPackage.length > 0) {
      await updateGenerationStatus(mysteryId, packageId, -1, "Generation failed - partial content available", {
        hostGuide: fullPackage.includes("Host Guide"),
        characters: fullPackage.includes("Character"),
        clues: fullPackage.includes("Clues") || fullPackage.includes("Evidence"),
        solution: fullPackage.includes("Solution")
      }, true);
      
      console.log("Returning partial content after error");
      return fullPackage + "\n\n[Note: Generation was incomplete due to an error. You may want to regenerate this package.]";
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
const updateGenerationStatus = async (
  mysteryId: string, 
  packageId: string,
  progress: number, 
  currentStep: string,
  sections = {
    hostGuide: false,
    characters: false,
    clues: false,
    solution: false
  },
  isFailed = false
): Promise<void> => {
  try {
    const status = isFailed ? 'failed' : progress >= 100 ? 'completed' : 'in_progress';
    
    // Update the package status
    await supabase
      .from("mystery_packages")
      .update({ 
        generation_status: {
          status,
          progress: progress < 0 ? 0 : progress,
          currentStep,
          sections
        }
      })
      .eq("id", packageId);
      
    // Also update the conversation mystery_data to include progress info
    await supabase
      .from("conversations")
      .update({ 
        mystery_data: {
          ...supabase.rpc('get_mystery_data', { conversation_id: mysteryId }),
          generationProgress: progress < 0 ? 0 : progress,
          generationStep: currentStep
        }
      })
      .eq("id", mysteryId);
  } catch (error) {
    console.error("Error updating generation progress:", error);
  }
};
