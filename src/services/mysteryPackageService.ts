
import { supabase } from "@/lib/supabase";
import { getAIResponse, saveGenerationState, getGenerationState, clearGenerationState } from "@/services/aiService";
import { toast } from "sonner";

// Define error type for better error handling
interface ServiceError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

// Test mode toggle
let testModeEnabled = false;

export const getTestModeEnabled = () => {
  return testModeEnabled;
};

export const toggleTestMode = (enabled: boolean) => {
  testModeEnabled = enabled;
  console.log(`Test mode ${enabled ? 'enabled' : 'disabled'}`);
  return testModeEnabled;
};

// Define interface for the generation status
export interface GenerationStatus {
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  resumable?: boolean;
  sections?: {
    hostGuide?: boolean;
    characters?: boolean;
    clues?: boolean;
    inspectorScript?: boolean;
    characterMatrix?: boolean;
    solution?: boolean;
    [key: string]: boolean | undefined;
  };
}

export async function generateCompletePackage(mysteryId: string, testMode = false): Promise<string> {
  try {
    console.log("Fetching content for conversation ID:", mysteryId);
    
    // Get conversation data to retrieve mystery details
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("title, mystery_data, messages(*)")
      .eq("id", mysteryId)
      .single();
      
    if (conversationError) {
      console.error("Error fetching conversation data:", conversationError);
      throw new Error("Failed to fetch mystery details");
    }
    
    // Define initial status
    const initialStatus: GenerationStatus = {
      status: 'in_progress',
      progress: 0,
      currentStep: 'Starting generation...',
      sections: {
        hostGuide: false,
        characters: false,
        clues: false,
        inspectorScript: false,
        characterMatrix: false,
        solution: false
      }
    };
    
    // Save the initial state to display immediately
    await saveGenerationState(mysteryId, {
      currentlyGenerating: 'hostGuide',
      hostGuide: 'Starting generation...',
      generationStatus: initialStatus
    });
    
    // Check if a package entry exists, create if not
    const { data: packageData, error: checkError } = await supabase
      .from("mystery_packages")
      .select("id, content")
      .eq("conversation_id", mysteryId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking for existing package:", checkError);
    }
    
    let packageId: string;
    let existingContent: string | null = null;
    
    if (packageData) {
      packageId = packageData.id;
      if (packageData.content) {
        existingContent = packageData.content;
      }
      
      // Update the status to in progress
      const { error: updateError } = await supabase
        .from("mystery_packages")
        .update({
          generation_status: initialStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
        
      if (updateError) {
        console.error("Error updating package status:", updateError);
        throw new Error("Failed to update generation status");
      }
    } else {
      // Create a new package entry
      const { data: newPackage, error: createError } = await supabase
        .from("mystery_packages")
        .insert({
          conversation_id: mysteryId,
          content: "",
          generation_status: initialStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select("id")
        .single();
        
      if (createError || !newPackage) {
        console.error("Error creating package:", createError);
        throw new Error("Failed to create package record");
      }
      
      packageId = newPackage.id;
    }
    
    // Start the generation process
    try {
      // Call the actual generation process
      const content = await processGeneration(mysteryId, conversation, packageId, testMode, existingContent);
      
      // Update the conversation record to indicate successful generation
      try {
        await supabase
          .from("conversations")
          .update({
            has_complete_package: true,
            needs_package_generation: false,
            updated_at: new Date().toISOString()
          })
          .eq("id", mysteryId);
      } catch (updateErr) {
        console.error("Warning: Could not update conversation record:", updateErr);
        // Don't throw here, as the generation was successful
      }
      
      return content;
    } catch (error) {
      const err = error as ServiceError;
      console.error("Error in generation process:", err);
      
      // Update status to failed
      try {
        await supabase
          .from("mystery_packages")
          .update({
            generation_status: {
              status: 'failed',
              progress: 0,
              currentStep: 'Generation failed: ' + err.message,
              resumable: true
            },
            updated_at: new Date().toISOString()
          })
          .eq("id", packageId);
      } catch (updateErr) {
        console.error("Error updating failure status:", updateErr);
      }
      
      throw new Error(err.message || "Generation process failed");
    }
  } catch (error) {
    console.error("Error in generate complete package:", error);
    throw error;
  }
}

export async function resumePackageGeneration(mysteryId: string): Promise<string> {
  try {
    // Check if any partial generation exists
    const { data: existingPackage, error: packageError } = await supabase
      .from("mystery_packages")
      .select("id, generation_status, partial_content, content")
      .eq("conversation_id", mysteryId)
      .maybeSingle();
      
    if (packageError) {
      console.error("Error checking for existing package:", packageError);
      throw new Error("Failed to check existing package");
    }
    
    if (!existingPackage) {
      throw new Error("No existing package found to resume");
    }
    
    // Check if there's content to resume from
    if (!existingPackage.content) {
      throw new Error("No content found to resume from");
    }
    
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("title, mystery_data, messages(*)")
      .eq("id", mysteryId)
      .single();
      
    if (conversationError) {
      console.error("Error fetching conversation data:", conversationError);
      throw new Error("Failed to fetch mystery details");
    }
    
    // Initialize resuming status
    const resumeStatus: GenerationStatus = {
      status: 'in_progress',
      progress: 0,
      currentStep: 'Resuming generation...',
      sections: existingPackage.generation_status?.sections || {
        hostGuide: false,
        characters: false,
        clues: false,
        inspectorScript: false,
        characterMatrix: false
      }
    };
    
    // Update status to resuming
    const { error: updateError } = await supabase
      .from("mystery_packages")
      .update({
        generation_status: resumeStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", existingPackage.id);
      
    if (updateError) {
      console.error("Error updating package status:", updateError);
      throw new Error("Failed to update generation status");
    }
    
    // Save the initial state to display immediately
    await saveGenerationState(mysteryId, {
      currentlyGenerating: 'hostGuide',
      hostGuide: 'Resuming generation...',
      generationStatus: resumeStatus
    });
    
    // Get test mode status from partial content if available
    let testMode = false;
    if (existingPackage.partial_content && typeof existingPackage.partial_content === 'object') {
      testMode = !!existingPackage.partial_content.is_test_mode;
    }
    
    // Continue with generation
    const content = await processGeneration(
      mysteryId, 
      conversation, 
      existingPackage.id, 
      testMode, 
      existingPackage.content
    );
    
    return content;
  } catch (error) {
    console.error("Error resuming package generation:", error);
    throw error;
  }
}

async function processGeneration(
  mysteryId: string, 
  conversation: any, 
  packageId: string,
  testMode: boolean,
  existingContent: string | null
): Promise<string> {
  try {
    // Create a safe update object for the partial_content
    const updatePartialContent = {
      is_test_mode: testMode,
      last_updated: new Date().toISOString(),
      is_resumable: true
    };
    
    // Update with safe content for partial_content
    const { error: partialUpdateError } = await supabase
      .from("mystery_packages")
      .update({
        partial_content: updatePartialContent 
      })
      .eq("id", packageId);
    
    if (partialUpdateError) {
      console.error("Error updating partial content:", partialUpdateError);
    }
    
    // Generate content based on mystery data
    let content = existingContent || "";
    if (!content) {
      content = `# ${conversation.title || "Murder Mystery"} - FULL PACKAGE\n\n`;
    }
    
    // Define sections to generate
    const sections = [
      { name: "Host Guide", key: "hostGuide", progress: 20, prompt: "Create a comprehensive host guide for this murder mystery" },
      { name: "Characters", key: "characters", progress: 40, prompt: "Create detailed character descriptions for all characters in this murder mystery" },
      { name: "Evidence Cards", key: "clues", progress: 60, prompt: "Create evidence cards and clues for this murder mystery" },
      { name: "Inspector Script", key: "inspectorScript", progress: 80, prompt: "Create an inspector or detective script for this murder mystery" },
      { name: "Character Relationship Matrix", key: "characterMatrix", progress: 90, prompt: "Create a character relationship matrix showing how all characters relate to each other" }
    ];
    
    // Prepare messages for AI generation
    const baseMessages = conversation.messages || [];
    
    // Convert messages to format expected by AI service
    const formattedMessages = baseMessages.map((msg: any) => ({
      role: msg.role || (msg.is_ai ? "assistant" : "user"),
      content: msg.content
    }));
    
    // Generate each section
    for (const section of sections) {
      // Update status
      const status: GenerationStatus = {
        status: 'in_progress',
        progress: section.progress,
        currentStep: `Generating ${section.name}...`,
        sections: {
          hostGuide: section.key === "hostGuide" || section.progress > 20,
          characters: section.key === "characters" || section.progress > 40,
          clues: section.key === "clues" || section.progress > 60,
          inspectorScript: section.key === "inspectorScript" || section.progress > 80,
          characterMatrix: section.key === "characterMatrix" || section.progress >= 90
        }
      };
      
      // Update database status
      await supabase
        .from("mystery_packages")
        .update({
          generation_status: status,
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
      
      // Update local status for real-time display
      await saveGenerationState(mysteryId, {
        currentlyGenerating: section.key,
        [section.key]: `Generating ${section.name}...`,
        generationStatus: status
      });
      
      // In test mode, just add placeholder content after a short delay
      if (testMode) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        content += `\n\n# ${section.name.toUpperCase()}\n\n`;
        content += `This is a test mode ${section.name.toLowerCase()}. In production, this would contain real generated content.\n`;
        continue;
      }
      
      try {
        // Create the specific prompt for this section
        const sectionMessages = [...formattedMessages];
        
        // Add a system message for the specific section
        sectionMessages.push({
          role: "user",
          content: `Based on the mystery we've discussed, ${section.prompt}. Make it detailed and comprehensive. Format it in markdown.`
        });
        
        // Call the AI service to generate content for this section
        console.log(`Generating ${section.name} with ${sectionMessages.length} messages`);
        const sectionContent = await getAIResponse(
          sectionMessages,
          'paid', // Use paid version for complete package
          `You are a creative murder mystery writer tasked with creating a ${section.name.toLowerCase()} for the mystery we've been discussing. 
           Provide detailed and comprehensive content formatted in markdown.`,
          testMode
        );
        
        // Add the generated section to the content
        content += `\n\n# ${section.name.toUpperCase()}\n\n`;
        content += sectionContent.trim();
        
        // Add a separator
        content += "\n\n---\n\n";
        
        // Update database with the current content
        await supabase
          .from("mystery_packages")
          .update({
            content: content,
            updated_at: new Date().toISOString()
          })
          .eq("id", packageId);
        
        // Short delay between sections to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (sectionError) {
        console.error(`Error generating ${section.name}:`, sectionError);
        
        // Add error note to content
        content += `\n\n# ${section.name.toUpperCase()}\n\n`;
        content += `*There was an error generating this section. Please try regenerating the package.*\n\n`;
        
        // Continue with next section - don't break the whole generation
      }
    }
    
    // Add a solution section at the end
    try {
      const solutionStatus: GenerationStatus = {
        status: 'in_progress',
        progress: 95,
        currentStep: 'Generating Solution...',
        sections: {
          hostGuide: true,
          characters: true,
          clues: true,
          inspectorScript: true,
          characterMatrix: true,
          solution: true
        }
      };
      
      await supabase
        .from("mystery_packages")
        .update({
          generation_status: solutionStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
      
      await saveGenerationState(mysteryId, {
        currentlyGenerating: 'solution',
        solution: 'Generating Solution...',
        generationStatus: solutionStatus
      });
      
      if (!testMode) {
        // Generate a solution summary
        const solutionMessages = [...formattedMessages];
        solutionMessages.push({
          role: "user",
          content: "Please provide a concise solution to the murder mystery, explaining who the murderer is, their motive, and how they committed the crime."
        });
        
        const solutionContent = await getAIResponse(
          solutionMessages,
          'paid',
          'Provide a concise solution to the murder mystery, explaining who the murderer is, their motive, and how they committed the crime.',
          testMode
        );
        
        content += `\n\n# SOLUTION\n\n`;
        content += solutionContent.trim();
      } else {
        // Test mode placeholder
        await new Promise(resolve => setTimeout(resolve, 1000));
        content += `\n\n# SOLUTION\n\n`;
        content += `This is a test mode solution. In production, this would reveal the murderer and their motives.\n`;
      }
      
      // Final content update
      await supabase
        .from("mystery_packages")
        .update({
          content: content,
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
    } catch (solutionError) {
      console.error("Error generating solution:", solutionError);
      content += `\n\n# SOLUTION\n\n`;
      content += `*There was an error generating the solution. Please try regenerating the package.*\n\n`;
    }
    
    // Mark as completed
    const completedStatus: GenerationStatus = {
      status: 'completed',
      progress: 100,
      currentStep: 'Generation completed',
      sections: {
        hostGuide: true,
        characters: true,
        clues: true,
        inspectorScript: true,
        characterMatrix: true,
        solution: true
      }
    };
    
    await supabase
      .from("mystery_packages")
      .update({
        generation_status: completedStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", packageId);
    
    await saveGenerationState(mysteryId, {
      generationStatus: completedStatus
    });
    
    // Update the conversation record to mark package as generated
    try {
      await supabase
        .from("conversations")
        .update({
          has_complete_package: true,
          needs_package_generation: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", mysteryId);
    } catch (updateErr) {
      console.error("Warning: Could not update conversation record:", updateErr);
      // Don't throw here as generation was successful
    }
    
    await clearGenerationState(mysteryId);
    
    return content;
  } catch (error) {
    console.error("Error in process generation:", error);
    throw error;
  }
}

export async function getPackageGenerationStatus(mysteryId: string): Promise<GenerationStatus> {
  try {
    // Try to get cached status first
    const cachedState = await getGenerationState(mysteryId);
    if (cachedState && cachedState.generationStatus) {
      return cachedState.generationStatus;
    }
    
    const { data, error } = await supabase
      .from("mystery_packages")
      .select("generation_status")
      .eq("conversation_id", mysteryId)
      .maybeSingle();
      
    if (error) {
      console.error("Error fetching generation status:", error);
      throw new Error("Failed to fetch generation status");
    }
    
    if (!data || !data.generation_status) {
      return {
        status: 'not_started',
        progress: 0,
        currentStep: 'Not started',
        sections: {}
      };
    }
    
    return data.generation_status as GenerationStatus;
  } catch (error) {
    console.error("Error in getPackageGenerationStatus:", error);
    throw error;
  }
}
