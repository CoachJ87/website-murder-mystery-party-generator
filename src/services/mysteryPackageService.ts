
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
    
    // 6. Generate the package in smaller chunks with improved retry logic
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
  const maxRetries = 4; // Increased for more reliability
  const backoffFactor = 1.5; // Exponential backoff factor
  
  try {
    // Split generation into 5 smaller sections for more reliability
    const sections = [
      {
        name: "Host Guide Introduction",
        prompt: "Based on our previous conversation, generate the introduction and setup section of the host guide for this murder mystery package. Include basic setup instructions and overview of the mystery.",
        progress: 10,
        sectionKey: "hostGuide",
        partial: true
      },
      {
        name: "Host Guide Details",
        prompt: "Continue with the host guide by providing the detailed timeline, event structure, and specific instructions for the host to follow.",
        progress: 25,
        sectionKey: "hostGuide",
        partial: false
      },
      {
        name: "Character Guides - Main Characters",
        prompt: "Based on our previous conversation and the host guide, generate detailed guides for the main 3-4 characters in the mystery, including their background, motives, and secrets.",
        progress: 40,
        sectionKey: "characters",
        partial: true
      },
      {
        name: "Character Guides - Supporting Characters",
        prompt: "Now generate detailed guides for the remaining supporting characters in the mystery.",
        progress: 55,
        sectionKey: "characters",
        partial: false
      },
      {
        name: "Clues and Evidence",
        prompt: "Generate the clues and evidence section, including details about physical clues, conversation prompts, and how/when they should be introduced during the mystery.",
        progress: 70,
        sectionKey: "clues",
        partial: false
      },
      {
        name: "Printable Materials",
        prompt: "Create printable materials such as evidence cards, name tags, or other props needed for the mystery.",
        progress: 85,
        sectionKey: "clues",
        partial: false
      },
      {
        name: "Solution and Wrap-up",
        prompt: "Generate the solution section explaining how the murder was committed, all evidence pointing to the killer, and instructions for the reveal and wrap-up of the mystery event.",
        progress: 95,
        sectionKey: "solution",
        partial: false
      }
    ];
    
    let currentContent = "";
    let completedSections = {
      hostGuide: false,
      characters: false,
      clues: false,
      solution: false
    };
    
    // Process each section sequentially with retry logic
    for (const section of sections) {
      console.log(`Generating section: ${section.name}`);
      let sectionContent = "";
      let retries = 0;
      
      while (retries < maxRetries) {
        try {
          await updateGenerationStatus(
            mysteryId, 
            packageId, 
            section.progress, 
            `Generating ${section.name}`, 
            {
              ...completedSections,
              [section.sectionKey]: section.partial ? false : true
            }
          );
          
          const sectionPrompt: Message = {
            is_ai: false,
            content: section.prompt
          };
          
          // Create context from previous content
          const contextMessages = [
            ...messages,
            { is_ai: true, content: currentContent },
            sectionPrompt
          ];
          
          sectionContent = await getAIResponse(
            contextMessages,
            "paid",
            "You are an expert murder mystery creator tasked with creating detailed content for a specific section of a murder mystery package."
          );
          
          // Update our accumulated content
          if (fullPackage.length > 0 && !sectionContent.startsWith("\n")) {
            fullPackage += "\n\n";
          }
          fullPackage += sectionContent;
          currentContent += sectionContent;
          
          // Store incremental results
          await updatePackageContent(packageId, fullPackage);
          
          // Mark section as completed
          if (!section.partial) {
            completedSections[section.sectionKey] = true;
          }
          
          // Success - break out of retry loop
          break;
        } catch (error) {
          retries++;
          console.error(`Error generating ${section.name}, attempt ${retries}:`, error);
          
          if (retries >= maxRetries) {
            console.warn(`Failed to generate ${section.name} after ${maxRetries} attempts`);
            // Continue with next section even if this one failed
            fullPackage += `\n\n## ${section.name}\n\n[Content generation failed for this section]\n\n`;
            await updatePackageContent(packageId, fullPackage);
            break;
          }
          
          // Exponential backoff before retry
          const delay = 2000 * Math.pow(backoffFactor, retries);
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Ensure any partial sections are properly marked as complete at the end
    completedSections = {
      hostGuide: true,
      characters: true, 
      clues: true,
      solution: true
    };
    
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
    const { data: mysteryData } = await supabase.rpc('get_mystery_data', { conversation_id: mysteryId });
    
    await supabase
      .from("conversations")
      .update({ 
        mystery_data: {
          ...(mysteryData || {}),
          generationProgress: progress < 0 ? 0 : progress,
          generationStep: currentStep
        }
      })
      .eq("id", mysteryId);
  } catch (error) {
    console.error("Error updating generation progress:", error);
  }
};
