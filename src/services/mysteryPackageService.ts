import { getAIResponse, saveGenerationState, getGenerationState, clearGenerationState } from '@/services/aiService';
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
    solution?: boolean;  // Make solution optional
  };
  lastUpdated?: string; // Timestamp of last update
  resumable?: boolean; // Whether generation can be resumed
  currentSection?: string; // Current section being generated
}

/**
 * Generates a complete murder mystery package based on an existing conversation
 * using a chunked approach to avoid timeouts with improved resumability
 */
export const generateCompletePackage = async (
  mysteryId: string, 
  testMode: boolean = false,
  resumeFrom?: string // Optional parameter to resume from a specific section
): Promise<string> => {
  try {
    // 1. Check for existing generation state in local/session storage
    const savedState = getGenerationState(mysteryId);
    let fullPackage = "";
    let lastCompletedSection = "";
    
    if (savedState && savedState.content) {
      console.log("Resuming generation from saved state:", savedState.lastCompletedSection);
      fullPackage = savedState.content;
      lastCompletedSection = savedState.lastCompletedSection || "";
      
      // If explicitly provided resumeFrom parameter, use that instead
      if (resumeFrom) {
        lastCompletedSection = resumeFrom;
      }
    }
    
    // 2. Fetch the original conversation
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("*, user_id")
      .eq("id", mysteryId)
      .single();
      
    if (convError) {
      console.error("Error fetching original conversation:", convError);
      throw new Error("Could not find the original conversation");
    }
    
    // 3. Fetch all messages from this conversation
    const { data: messagesData, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversations.id)
      .order("created_at", { ascending: true });
      
    if (msgError) {
      console.error("Error fetching messages:", msgError);
      throw new Error("Could not retrieve conversation messages");
    }
    
    // 4. Format messages for the AI service
    const messages: Message[] = messagesData.map(msg => ({
      is_ai: msg.is_ai,
      content: msg.content
    }));
    
    // 5. Check for existing package record
    const { data: existingPackage } = await supabase
      .from("mystery_packages")
      .select("id, content, generation_status")
      .eq("conversation_id", mysteryId)
      .maybeSingle();
      
    let packageId: string;
    let existingContent: string = "";
    
    // 6. If we have an existing package, use its content and update its status
    if (existingPackage) {
      packageId = existingPackage.id;
      
      // If the package already has content and we're not explicitly resuming, use it
      if (existingPackage.content && !resumeFrom) {
        existingContent = existingPackage.content;
        fullPackage = existingPackage.content;
      }
      
      // Update the generation status to indicate we're resuming/restarting
      await supabase
        .from("mystery_packages")
        .update({
          generation_status: {
            status: 'in_progress',
            progress: fullPackage ? 25 : 0, // If we have content already, start at 25%
            currentStep: fullPackage ? 'Resuming generation...' : 'Starting generation',
            sections: {
              hostGuide: !!fullPackage,
              characters: false,
              clues: false
            },
            resumable: true,
            lastUpdated: new Date().toISOString(),
            currentSection: 'hostGuide' // Start with host guide
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
    } else {
      // 7. If no existing package, create a new package record
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
              clues: false
            },
            resumable: true,
            lastUpdated: new Date().toISOString(),
            currentSection: 'hostGuide' // Start with host guide
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
    
    // 8. Update conversation status to indicate generation has started
    await supabase
      .from("conversations")
      .update({ 
        has_complete_package: false,
        needs_package_generation: true,
        display_status: "purchased"
      })
      .eq("id", mysteryId);
    
    // 9. Generate the package in smaller chunks with improved retry and resume logic
    const packageContent = await generatePackageInChunks(
      messages, 
      mysteryId, 
      packageId, 
      testMode,
      lastCompletedSection,
      fullPackage
    );
    
    // 10. Store the final result
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
            clues: true
          },
          lastUpdated: new Date().toISOString(),
          resumable: false,
          currentSection: 'completed'
        },
        updated_at: new Date().toISOString()
      })
      .eq("id", packageId);
    
    // Clear saved state now that we're done
    clearGenerationState(mysteryId);
    
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
 * Now with enhanced resumability support
 */
export const getPackageGenerationStatus = async (mysteryId: string): Promise<GenerationStatus> => {
  try {
    // First check local storage for most recent generation state
    const localState = getGenerationState(mysteryId);
    
    // Check if there's an existing package for this mystery
    const { data: packageData, error: packageError } = await supabase
      .from("mystery_packages")
      .select("generation_status, content")
      .eq("conversation_id", mysteryId)
      .single();
    
    // If we have a more recent local state, prioritize that
    if (localState && localState.lastUpdated) {
      const localDate = new Date(localState.lastUpdated);
      const serverDate = packageData?.generation_status?.lastUpdated ? 
        new Date(packageData.generation_status.lastUpdated) : 
        new Date(0);
      
      if (localDate > serverDate) {
        console.log("Using more recent local generation state");
        return {
          ...localState,
          resumable: true
        };
      }
    }
      
    if (packageError) {
      return {
        status: 'pending',
        progress: 0,
        currentStep: 'Not started',
        sections: {
          hostGuide: false,
          characters: false,
          clues: false
        }
      };
    }
    
    if (packageData.generation_status) {
      return {
        ...packageData.generation_status as GenerationStatus,
        resumable: packageData.generation_status.status === 'in_progress' || 
                  packageData.generation_status.status === 'failed'
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
        currentStep: 'Generation complete',
        sections: {
          hostGuide: true,
          characters: true,
          clues: true
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
        currentStep: progress < 30 ? 'Generating host guide (5-10 minutes remaining)' : 
                     progress < 60 ? 'Generating character guides (3-7 minutes remaining)' : 
                     'Finalizing materials (1-3 minutes remaining)',
        sections: {
          hostGuide: progress >= 25,
          characters: progress >= 50,
          clues: progress >= 75
        },
        resumable: true
      };
    }
    
    return {
      status: 'pending',
      progress: 0,
      currentStep: 'Waiting to start',
      sections: {
        hostGuide: false,
        characters: false,
        clues: false
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
        clues: false
      },
      resumable: true
    };
  }
};

/**
 * Resume an interrupted package generation
 */
export const resumePackageGeneration = async (mysteryId: string, testMode: boolean = false): Promise<string> => {
  try {
    // Check for existing generation state
    const savedState = getGenerationState(mysteryId);
    
    if (!savedState) {
      // If no saved state, restart from scratch
      return generateCompletePackage(mysteryId, testMode);
    }
    
    // Resume from the last completed section
    return generateCompletePackage(
      mysteryId, 
      testMode, 
      savedState.lastCompletedSection
    );
  } catch (error) {
    console.error("Error resuming package generation:", error);
    throw error;
  }
};

/**
 * Extracts sections from the AI-generated content using regex patterns
 */
const extractSections = (content: string) => {
  const sections = {
    hostGuide: '',
    detectiveScript: '',
    evidenceCards: [] as any[],
    relationshipMatrix: {} as any,
    characters: [] as any[]
  };

  // Extract host guide section
  const hostGuideMatch = content.match(/# .+ - HOST GUIDE\n([\s\S]*?)(?=# |$)/);
  if (hostGuideMatch) {
    sections.hostGuide = hostGuideMatch[1].trim();
  }

  // Extract detective script
  const detectiveMatch = content.match(/# INSPECTOR SCRIPT\n([\s\S]*?)(?=# |$)/);
  if (detectiveMatch) {
    sections.detectiveScript = detectiveMatch[1].trim();
  }

  // Extract evidence cards
  const evidencePattern = /# EVIDENCE: .*?\n([\s\S]*?)(?=# EVIDENCE:|# |$)/g;
  let evidenceMatch;
  while ((evidenceMatch = evidencePattern.exec(content)) !== null) {
    const cardContent = evidenceMatch[1].trim();
    sections.evidenceCards.push({
      content: cardContent,
      created_at: new Date().toISOString()
    });
  }

  // Extract character information
  const characterPattern = /# ([^-\n]+) - CHARACTER GUIDE\n([\s\S]*?)(?=# \w+ - CHARACTER GUIDE|# |$)/g;
  let characterMatch;
  while ((characterMatch = characterPattern.exec(content)) !== null) {
    const characterName = characterMatch[1].trim();
    const characterContent = characterMatch[2].trim();
    
    // Extract character details
    const description = characterContent.match(/## CHARACTER DESCRIPTION\n([\s\S]*?)(?=##|$)/)?.[1]?.trim();
    const background = characterContent.match(/## YOUR BACKGROUND\n([\s\S]*?)(?=##|$)/)?.[1]?.trim();
    const relationshipsSection = characterContent.match(/## YOUR RELATIONSHIPS\n([\s\S]*?)(?=##|$)/)?.[1]?.trim();
    const secretsSection = characterContent.match(/## YOUR SECRET\n([\s\S]*?)(?=##|$)/)?.[1]?.trim();
    
    // Extract round scripts
    const roundScripts = {
      introduction: characterContent.match(/### SAY HELLO\n"([^"]+)"/)?.[1],
      round2: {
        innocent: characterContent.match(/\*\*IF YOU ARE INNOCENT:\*\*\n"([^"]+)"/)?.[1],
        guilty: characterContent.match(/\*\*IF YOU ARE GUILTY:\*\*\n"([^"]+)"/)?.[1],
        accomplice: characterContent.match(/\*\*IF YOU ARE THE ACCOMPLICE:\*\*\n"([^"]+)"/)?.[1]
      },
      // ... similar pattern for rounds 3 and 4
      final: {
        innocent: characterContent.match(/\*\*IF YOU ARE INNOCENT:\*\*\n"([^"]+)"/)?.[1],
        guilty: characterContent.match(/\*\*IF YOU ARE GUILTY:\*\*\n"([^"]+)"/)?.[1],
        accomplice: characterContent.match(/\*\*IF YOU ARE THE ACCOMPLICE:\*\*\n"([^"]+)"/)?.[1]
      }
    };

    sections.characters.push({
      character_name: characterName,
      description,
      background,
      relationships: parseRelationships(relationshipsSection),
      secrets: secretsSection ? [secretsSection] : [],
      round_scripts: roundScripts
    });
  }

  // Extract relationship matrix
  const matrixMatch = content.match(/# CHARACTER RELATIONSHIP MATRIX\n([\s\S]*?)(?=# |$)/);
  if (matrixMatch) {
    sections.relationshipMatrix = parseRelationshipMatrix(matrixMatch[1].trim());
  }

  return sections;
};

const parseRelationships = (relationshipsText: string | undefined): any[] => {
  if (!relationshipsText) return [];
  
  const relationships = [];
  const relationshipPattern = /\*\*([^*]+)\*\*:\s*([^\n]+)/g;
  let match;
  
  while ((match = relationshipPattern.exec(relationshipsText)) !== null) {
    relationships.push({
      character: match[1].trim(),
      description: match[2].trim()
    });
  }
  
  return relationships;
};

const parseRelationshipMatrix = (matrixText: string): any => {
  const matrix: Record<string, any> = {};
  const lines = matrixText.split('\n').filter(line => line.trim());
  
  // Skip header row
  for (let i = 2; i < lines.length; i++) {
    const [name, primary, secondary, secret] = lines[i].split('|').map(cell => cell.trim());
    if (name && name !== '---') {
      matrix[name] = {
        primary_connection: primary,
        secondary_connections: secondary.split(',').map(s => s.trim()),
        secret_connections: secret.split(',').map(s => s.trim())
      };
    }
  }
  
  return matrix;
};

/**
 * Generate the package in logical chunks to avoid timeouts with improved resumability
 * With more frequent updates for streaming effect
 */
const generatePackageInChunks = async (
  messages: Message[], 
  mysteryId: string,
  packageId: string,
  testMode: boolean = false,
  lastCompletedSection: string = "",
  existingContent: string = ""
): Promise<string> => {
  let fullPackage = existingContent;
  const maxRetries = 4; // Increased for more reliability
  const backoffFactor = 1.5; // Exponential backoff factor
  let sectionsToGenerate = [];
  let startFromIndex = 0;
  
  try {
    // Use a reduced set of sections for test mode
    const allSections = testMode ? [
      {
        name: "Host Guide",
        prompt: "Based on our previous conversation, generate a concise host guide for this murder mystery package. Keep it very brief since this is for testing.",
        progress: 25,
        sectionKey: "hostGuide",
        partial: false
      },
      {
        name: "Character Guides",
        prompt: "Based on our previous conversation, generate brief character guides for this murder mystery. Include just enough detail to test the system.",
        progress: 65,
        sectionKey: "characters",
        partial: false
      },
      {
        name: "Clues and Evidence",
        prompt: "Generate a condensed clues and evidence section, including just the essential details for testing purposes.",
        progress: 95,
        sectionKey: "clues",
        partial: false
      }
    ] : [
      // Full sections for normal mode
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
        name: "Detective Script",
        prompt: "Create a detective script for the person who will play the inspector/detective role in the mystery.",
        progress: 85,
        sectionKey: "inspectorScript",
        partial: false
      },
      {
        name: "Character Matrix",
        prompt: "Create a character relationship matrix showing how all characters are connected.",
        progress: 95,
        sectionKey: "characterMatrix",
        partial: false
      }
    ];
    
    // If we're resuming, determine where to start
    if (lastCompletedSection) {
      const lastCompletedIndex = allSections.findIndex(section => section.name === lastCompletedSection);
      if (lastCompletedIndex >= 0) {
        startFromIndex = lastCompletedIndex + 1;
        console.log(`Resuming from section ${startFromIndex}: ${allSections[startFromIndex]?.name}`);
      }
    }
    
    // Select only the remaining sections to generate
    sectionsToGenerate = allSections.slice(startFromIndex);
    
    let currentContent = fullPackage;
    let completedSections = {
      hostGuide: allSections.slice(0, startFromIndex).some(s => s.sectionKey === "hostGuide" && !s.partial),
      characters: allSections.slice(0, startFromIndex).some(s => s.sectionKey === "characters" && !s.partial),
      clues: allSections.slice(0, startFromIndex).some(s => s.sectionKey === "clues" && !s.partial)
    };
    
    // Process each remaining section sequentially with retry logic
    for (let i = 0; i < sectionsToGenerate.length; i++) {
      const section = sectionsToGenerate[i];
      console.log(`Generating section ${i + startFromIndex}: ${section.name}`);
      
      let sectionContent = "";
      let retries = 0;
      let lastError = null;
      
      // Save the current state before starting this section
      saveGenerationState(mysteryId, {
        content: fullPackage,
        lastCompletedSection: i > 0 ? sectionsToGenerate[i-1].name : lastCompletedSection,
        progress: section.progress,
        currentStep: `About to generate ${section.name}`,
        sections: completedSections,
        currentSection: section.sectionKey
      });
      
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
            },
            section.sectionKey // Pass current section for streaming UI updates
          );
          
          const sectionPrompt: Message = {
            is_ai: false,
            content: section.prompt
          };
          
          // Create context from previous content
          const contextMessages = [
            ...messages,
            { is_ai: true, content: currentContent.length > 2000 ? 
                            currentContent.substring(currentContent.length - 2000) : 
                            currentContent },
            sectionPrompt
          ];
          
          // For streaming effect, let's update more frequently for live generation
          // Simulate streaming by sending small updates (about 10 updates per section)
          const updateCount = 10;
          const chunkSize = Math.max(20, Math.floor(testMode ? 100 : 200) / updateCount);
          
          sectionContent = await getAIResponse(
            contextMessages,
            "paid",
            "You are an expert murder mystery creator tasked with creating detailed content for a specific section of a murder mystery package.",
            testMode
          );
          
          // Update our accumulated content
          if (fullPackage.length > 0 && !sectionContent.startsWith("\n")) {
            fullPackage += "\n\n";
          }
          fullPackage += sectionContent;
          currentContent += sectionContent;
          
          // Simulate streaming by updating package content in smaller chunks
          // for real-time visual feedback in the UI
          for (let j = 1; j <= updateCount; j++) {
            const partialContent = fullPackage.substring(0, 
              Math.floor(existingContent.length + (j * sectionContent.length / updateCount))
            );
            
            await updatePackageContent(packageId, partialContent);
            
            // Update progress incrementally
            const chunkProgress = section.progress - (sectionsToGenerate[i-1]?.progress || 0);
            const progressIncrement = (sectionsToGenerate[i-1]?.progress || 0) + 
              (chunkProgress * (j / updateCount));
            
            await updateGenerationStatus(
              mysteryId,
              packageId,
              progressIncrement,
              `Generating ${section.name}`,
              completedSections,
              section.sectionKey // Current section for streaming updates
            );
            
            // Small delay to simulate typing effect
            await new Promise(resolve => setTimeout(resolve, testMode ? 100 : 200));
          }
          
          // Store incremental results - both in database and local storage
          await updatePackageContent(packageId, fullPackage);
          saveGenerationState(mysteryId, {
            content: fullPackage,
            lastCompletedSection: section.name,
            progress: section.progress,
            currentStep: `Completed ${section.name}`,
            sections: {
              ...completedSections,
              [section.sectionKey]: !section.partial
            },
            currentSection: section.sectionKey
          });
          
          // Mark section as completed
          if (!section.partial) {
            completedSections[section.sectionKey] = true;
          }
          
          // Success - break out of retry loop
          break;
        } catch (error) {
          retries++;
          lastError = error;
          console.error(`Error generating ${section.name}, attempt ${retries}:`, error);
          
          // Save state indicating the error so we can resume
          saveGenerationState(mysteryId, {
            content: fullPackage,
            lastCompletedSection: i > 0 ? sectionsToGenerate[i-1].name : lastCompletedSection,
            progress: section.progress,
            currentStep: `Error in ${section.name}, attempt ${retries}`,
            error: error.message,
            sections: completedSections,
            currentSection: section.sectionKey
          });
          
          if (retries >= maxRetries) {
            console.warn(`Failed to generate ${section.name} after ${maxRetries} attempts`);
            
            // Continue with next section even if this one failed
            fullPackage += `\n\n## ${section.name}\n\n[Content generation failed for this section. You may want to regenerate this mystery.]\n\n`;
            await updatePackageContent(packageId, fullPackage);
            break;
          }
          
          // Exponential backoff before retry
          const delay = 2000 * Math.pow(backoffFactor, retries);
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // If we failed to generate this section after all retries and it's a non-partial section,
      // still mark it as done to allow progression to the next section
      if (retries >= maxRetries && !section.partial) {
        completedSections[section.sectionKey] = true;
      }
    }
    
    // Ensure any partial sections are properly marked as complete at the end
    completedSections = {
      hostGuide: true,
      characters: true, 
      clues: true
    };
    
    // Clear saved state since we're done
    clearGenerationState(mysteryId);
    
    // Extract sections from the generated content
    const sections = extractSections(fullPackage);
    
    // Store the sections in the database
    await supabase
      .from('mystery_packages')
      .update({
        content: fullPackage, // Keep the full content for reference
        host_guide: sections.hostGuide,
        detective_script: sections.detectiveScript,
        evidence_cards: sections.evidenceCards,
        relationship_matrix: sections.relationshipMatrix,
        updated_at: new Date().toISOString()
      })
      .eq('id', packageId);
      
    // Store character information
    for (const character of sections.characters) {
      await supabase
        .from('mystery_characters')
        .insert({
          package_id: packageId,
          ...character
        });
    }
    
    return fullPackage;
    
  } catch (error) {
    console.error("Error in chunked generation:", error);
    
    // If we hit an error but have partial content, update status and return partial content
    if (fullPackage.length > 0) {
      // Save the current state even though there was an error
      saveGenerationState(mysteryId, {
        content: fullPackage,
        lastCompletedSection: sectionsToGenerate.length > 0 ? 
                               (lastCompletedSection || "none") : 
                               "none",
        progress: -1,
        currentStep: "Generation failed - partial content available",
        error: error.message,
        sections: {
          hostGuide: fullPackage.includes("Host Guide"),
          characters: fullPackage.includes("Character"),
          clues: fullPackage.includes("Clues") || fullPackage.includes("Evidence")
        }
      });
      
      await updateGenerationStatus(mysteryId, packageId, -1, "Generation failed - partial content available", {
        hostGuide: fullPackage.includes("Host Guide"),
        characters: fullPackage.includes("Character"),
        clues: fullPackage.includes("Clues") || fullPackage.includes("Evidence")
      }, undefined, true);
      
      console.log("Returning partial content after error");
      return fullPackage + "\n\n[Note: Generation was incomplete due to an error. You can try resuming the generation.]\n\n";
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
    clues: false
  },
  currentSection?: string,
  isFailed = false
): Promise<void> => {
  try {
    const status = isFailed ? 'failed' : progress >= 100 ? 'completed' : 'in_progress';
    const timestamp = new Date().toISOString();
    
    // Update the package status
    await supabase
      .from("mystery_packages")
      .update({ 
        generation_status: {
          status,
          progress: progress < 0 ? 0 : progress,
          currentStep,
          sections,
          lastUpdated: timestamp,
          resumable: status !== 'completed',
          currentSection
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
          generationStep: currentStep,
          currentSection
        }
      })
      .eq("id", mysteryId);
    
    // Also save to local storage for resilience
    saveGenerationState(mysteryId, {
      progress: progress < 0 ? 0 : progress,
      currentStep,
      sections,
      lastUpdated: timestamp,
      status,
      currentSection
    });
  } catch (error) {
    console.error("Error updating generation progress:", error);
  }
};

// New function to toggle test mode for generation
export const toggleTestMode = (enabled: boolean): void => {
  try {
    localStorage.setItem('mystery_test_mode', JSON.stringify(enabled));
  } catch (error) {
    console.error("Failed to save test mode setting:", error);
  }
};

// Get current test mode setting
export const getTestModeEnabled = (): boolean => {
  try {
    const setting = localStorage.getItem('mystery_test_mode');
    return setting ? JSON.parse(setting) : false;
  } catch (error) {
    console.error("Failed to get test mode setting:", error);
    return false;
  }
};
