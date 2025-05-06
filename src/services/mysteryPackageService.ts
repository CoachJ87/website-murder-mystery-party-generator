import { supabase } from "@/lib/supabase";
import { getAIResponse, saveGenerationState, getGenerationState, clearGenerationState } from "@/services/aiService";
import { toast } from "sonner";
import { MysteryCharacter } from "@/interfaces/mystery";

export interface GenerationStatus {
  status: "not_started" | "in_progress" | "completed" | "failed";
  progress: number;
  currentStep?: string;
  error?: string;
  resumable?: boolean;
  sections?: {
    hostGuide?: boolean;
    characters?: boolean;
    clues?: boolean;
    inspectorScript?: boolean;
    characterMatrix?: boolean;
  };
}

// Mock data for testing UI without actual generation
const useMockData = false;

// Add test mode functionality
let testModeEnabled = false;

export const toggleTestMode = (enabled: boolean) => {
  testModeEnabled = enabled;
  localStorage.setItem('mysteryTestMode', enabled ? 'true' : 'false');
};

export const getTestModeEnabled = (): boolean => {
  const storedValue = localStorage.getItem('mysteryTestMode');
  return storedValue ? storedValue === 'true' : testModeEnabled;
};

export const getPackageGenerationStatus = async (mysteryId: string): Promise<GenerationStatus> => {
  try {
    // First, check local storage for cached status (for better UI responsiveness)
    const cachedState = getGenerationState(mysteryId);
    if (cachedState && cachedState.generationStatus) {
      return cachedState.generationStatus;
    }
    
    const { data, error } = await supabase
      .from("mystery_packages")
      .select("generation_status, content, updated_at")
      .eq("conversation_id", mysteryId)
      .single();
      
    if (error && error.code !== "PGRST116") {
      console.error("Error fetching generation status:", error);
      throw error;
    }
    
    if (!data) {
      return {
        status: "not_started",
        progress: 0,
        currentStep: "Not started"
      };
    }

    // Extract status from the JSONB generation_status field
    const generationStatus: GenerationStatus = data.generation_status ? {
      status: data.generation_status.status || "not_started",
      progress: data.generation_status.progress || 0,
      currentStep: data.generation_status.currentStep || "Initializing",
      error: data.generation_status.error,
      resumable: data.generation_status.status === "failed",
      sections: data.generation_status.sections || {
        hostGuide: false,
        characters: false,
        clues: false,
        inspectorScript: false,
        characterMatrix: false
      }
    } : {
      status: "not_started",
      progress: 0,
      currentStep: "Not started"
    };
    
    // If we have content but status doesn't reflect it, update the status
    if (data.content && generationStatus.status !== "completed") {
      generationStatus.status = "completed";
      generationStatus.progress = 100;
    }
    
    // Save the status in local storage for future reference
    const existingState = getGenerationState(mysteryId) || {};
    saveGenerationState(mysteryId, {
      ...existingState,
      generationStatus
    });
    
    return generationStatus;
  } catch (error) {
    console.error("Error getting package generation status:", error);
    return {
      status: "not_started",
      progress: 0,
      error: "Failed to check generation status"
    };
  }
};

export const generateCompletePackage = async (mysteryId: string, testMode: boolean = false): Promise<string> => {
  // Use the testModeEnabled value if testMode is not explicitly provided
  if (testMode === undefined) {
    testMode = getTestModeEnabled();
  }
  
  if (useMockData) {
    return mockGeneratePackage(mysteryId);
  }

  try {
    // Check if any partial generation exists
    const { data: existingPackage, error: packageError } = await supabase
      .from("mystery_packages")
      .select("id, generation_status, partial_content")
      .eq("conversation_id", mysteryId)
      .maybeSingle();
      
    if (packageError && packageError.code !== "PGRST116") {
      console.error("Error checking for existing package:", packageError);
      throw packageError;
    }
    
    // Initialize or update the package record
    const initialStatus = {
      status: "in_progress",
      progress: 0,
      currentStep: "Starting generation...",
      sections: {
        hostGuide: false,
        characters: false,
        clues: false,
        inspectorScript: false,
        characterMatrix: false,
        solution: false
      }
    };
    
    if (!existingPackage) {
      const { error: createError } = await supabase.from("mystery_packages").insert({
        conversation_id: mysteryId,
        generation_status: initialStatus,
        content: "",
        partial_content: { is_test_mode: testMode }
      });
      
      if (createError) {
        console.error("Error creating package record:", createError);
        throw createError;
      }
    } else {
      // Create a safe update object that includes partial_content if it exists
      const updateData: any = {
        generation_status: initialStatus,
        updated_at: new Date().toISOString()
      };
      
      // Add partial_content to the update if it exists
      if (existingPackage.partial_content) {
        updateData.partial_content = { 
          ...existingPackage.partial_content, 
          is_test_mode: testMode,
          error_message: null,
          is_resumable: false
        };
      } else {
        updateData.partial_content = { 
          is_test_mode: testMode,
          error_message: null,
          is_resumable: false
        };
      }
      
      const { error: updateError } = await supabase
        .from("mystery_packages")
        .update(updateData)
        .eq("id", existingPackage.id);
        
      if (updateError) {
        console.error("Error updating package record:", updateError);
        throw updateError;
      }
    }
    
    // Fetch conversation data for context
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("title, mystery_data, messages")
      .eq("id", mysteryId)
      .single();
      
    if (convError) {
      console.error("Error fetching conversation data:", convError);
      throw convError;
    }
    
    // Save the initial state to localStorage for streaming effect
    saveGenerationState(mysteryId, {
      currentlyGenerating: 'hostGuide',
      hostGuide: 'Starting generation...',
      generationStatus: initialStatus,
      lastUpdated: new Date().toISOString()
    });
    
    // Start the generation process (this will happen asynchronously)
    generatePackageContent(mysteryId, conversation, testMode);
    
    // Return empty string since the content will be generated asynchronously
    return "";
  } catch (error) {
    console.error("Error starting package generation:", error);
    
    // Update the package status to failed
    await supabase
      .from("mystery_packages")
      .update({
        generation_status: {
          status: "failed",
          error: error.message,
          resumable: true
        },
        updated_at: new Date().toISOString()
      })
      .eq("conversation_id", mysteryId);
      
    throw error;
  }
};

export const resumePackageGeneration = async (mysteryId: string, testMode: boolean = false): Promise<string> => {
  // Use the testModeEnabled value if testMode is not explicitly provided
  if (testMode === undefined) {
    testMode = getTestModeEnabled();
  }
  
  if (useMockData) {
    return mockGeneratePackage(mysteryId);
  }
  
  try {
    // Get the existing package data
    const { data: existingPackage, error: packageError } = await supabase
      .from("mystery_packages")
      .select("id, content, host_guide, evidence_cards, detective_script, relationship_matrix, generation_status, partial_content")
      .eq("conversation_id", mysteryId)
      .single();
      
    if (packageError) {
      console.error("Error fetching existing package:", packageError);
      throw packageError;
    }
    
    // Update status to in_progress
    const resumeStatus = {
      status: "in_progress",
      progress: existingPackage.content ? 30 : 0, // Start with some progress if we have some content
      currentStep: "Resuming generation...",
      sections: {
        hostGuide: existingPackage.host_guide ? true : false,
        characters: existingPackage.partial_content?.characters ? true : false,
        clues: existingPackage.evidence_cards?.length > 0 ? true : false,
        inspectorScript: existingPackage.detective_script ? true : false,
        characterMatrix: existingPackage.relationship_matrix ? true : false
      }
    };
    
    const { error: updateError } = await supabase
      .from("mystery_packages")
      .update({
        generation_status: resumeStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", existingPackage.id);
      
    if (updateError) {
      console.error("Error updating package status:", updateError);
      throw updateError;
    }
    
    // Save the resume state to localStorage for streaming effect
    saveGenerationState(mysteryId, {
      currentlyGenerating: 'hostGuide',
      hostGuide: existingPackage.host_guide || 'Resuming generation...',
      generationStatus: resumeStatus,
      lastUpdated: new Date().toISOString()
    });
    
    // Fetch conversation data for context
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("title, mystery_data, messages")
      .eq("id", mysteryId)
      .single();
      
    if (convError) {
      console.error("Error fetching conversation data:", convError);
      throw convError;
    }
    
    // Resume the generation process
    generatePackageContent(mysteryId, conversation, testMode, existingPackage);
    
    // Return empty string since this is an async operation
    return "";
  } catch (error) {
    console.error("Error resuming package generation:", error);
    
    // Update status to failed
    await supabase
      .from("mystery_packages")
      .update({
        generation_status: {
          status: "failed",
          error: `Resume failed: ${error.message}`,
          resumable: true
        },
        updated_at: new Date().toISOString()
      })
      .eq("conversation_id", mysteryId);
      
    throw error;
  }
};

const updateSectionProgress = async (mysteryId: string, section: string, progress: number, content?: any) => {
  try {
    // Get current generation status first
    const { data, error } = await supabase
      .from("mystery_packages")
      .select("generation_status, id")
      .eq("conversation_id", mysteryId)
      .single();
      
    if (error) {
      console.error("Error getting current generation status:", error);
      throw error;
    }
    
    // Prepare updated status
    const currentStatus = data.generation_status || {
      status: "in_progress",
      progress: 0,
      sections: {}
    };
    
    const updatedStatus = {
      ...currentStatus,
      currentStep: section,
      progress: progress,
      sections: {
        ...currentStatus.sections,
        hostGuide: progress >= 30 || currentStatus.sections?.hostGuide,
        characters: progress >= 60 || currentStatus.sections?.characters,
        clues: progress >= 80 || currentStatus.sections?.clues,
        inspectorScript: progress >= 90 || currentStatus.sections?.inspectorScript,
        characterMatrix: progress >= 95 || currentStatus.sections?.characterMatrix
      }
    };
    
    // Update the database with current progress
    await supabase
      .from("mystery_packages")
      .update({
        generation_status: updatedStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", data.id);
      
    // Save streaming content to local storage for UI updates
    const existingState = getGenerationState(mysteryId) || {};
    const updatedState = { ...existingState };
    
    // Set currentlyGenerating based on section
    if (section.toLowerCase().includes('host')) {
      updatedState.currentlyGenerating = 'hostGuide';
      if (content) updatedState.hostGuide = content;
    } else if (section.toLowerCase().includes('character') && !section.toLowerCase().includes('matrix')) {
      updatedState.currentlyGenerating = 'characters';
      if (content) updatedState.characters = content;
    } else if (section.toLowerCase().includes('clue') || section.toLowerCase().includes('evidence')) {
      updatedState.currentlyGenerating = 'clues';
      if (content) updatedState.clues = content;
    } else if (section.toLowerCase().includes('detective') || section.toLowerCase().includes('inspector')) {
      updatedState.currentlyGenerating = 'inspectorScript';
      if (content) updatedState.inspectorScript = content;
    } else if (section.toLowerCase().includes('matrix') || section.toLowerCase().includes('relationship')) {
      updatedState.currentlyGenerating = 'characterMatrix';
      if (content) updatedState.characterMatrix = content;
    }
    
    // Update generationStatus
    updatedState.generationStatus = updatedStatus;
    updatedState.lastUpdated = new Date().toISOString();
    
    saveGenerationState(mysteryId, updatedState);
    
  } catch (error) {
    console.error("Error updating section progress:", error);
  }
};

const generatePackageContent = async (
  mysteryId: string, 
  conversation: any, 
  testMode: boolean = false,
  existingPackage?: any
) => {
  // Use the testModeEnabled value if testMode is not explicitly provided
  if (testMode === undefined) {
    testMode = getTestModeEnabled();
  }
  
  try {
    let fullContent = "";
    
    // Create a system prompt for the host guide
    const hostGuidePrompt = `
You are an expert murder mystery creator tasked with creating detailed content for a specific section of a murder mystery game package. 
Create the HOST GUIDE section for a murder mystery titled "${conversation.title}".

## OUTPUT FORMAT
Create a comprehensive HOST GUIDE section for this murder mystery that includes:

# ${conversation.title} - HOST GUIDE

## OVERVIEW
[1-2 paragraphs describing the basic premise of the mystery]

## SETUP
[Step-by-step setup instructions for the host including room preparation, materials needed, and timeline]

## MURDER SOLUTION
[Detailed explanation of who the murderer is, their motive, method, and how the crime was committed]

## ROUND STRUCTURE
[Clear instructions for each round of gameplay including what information to reveal when]

## TIPS FOR HOSTING
[5-7 bullet points with practical advice for running the game successfully]
`;

    // Generate Host Guide
    await updateSectionProgress(mysteryId, "Generating Host Guide", 10);
    
    // Check for existing content first
    let hostGuide = existingPackage?.host_guide || "";
    if (!hostGuide) {
      hostGuide = await getAIResponse(
        [
          {
            role: "system",
            content: hostGuidePrompt
          },
          {
            role: "user",
            content: `Create the HOST GUIDE section for my mystery "${conversation.title}" with theme: ${conversation.mystery_data?.theme || "classic murder mystery"}. 
            Player count: ${conversation.mystery_data?.playerCount || "8"}.
            Additional details: ${conversation.mystery_data?.additionalDetails || ""}
            `
          }
        ],
        "paid",
        undefined,
        testMode
      );
    }
    
    fullContent += hostGuide + "\n\n";
    
    // Save host guide and update progress
    await supabase
      .from("mystery_packages")
      .update({
        host_guide: hostGuide,
        content: fullContent,
        progress: 30
      })
      .eq("conversation_id", mysteryId);
      
    await updateSectionProgress(mysteryId, "Host Guide completed", 30, hostGuide);
    
    // Generate Character Guides
    await updateSectionProgress(mysteryId, "Generating Character Guides", 35);
    
    // Create character prompts and generate character content
    const characterCount = conversation.mystery_data?.playerCount || 8;
    let characters: MysteryCharacter[] = [];
    
    // Check for existing characters first
    if (existingPackage?.id) {
      const { data: existingCharacters } = await supabase
        .from("mystery_characters")
        .select("*")
        .eq("package_id", existingPackage.id);
        
      if (existingCharacters && existingCharacters.length > 0) {
        characters = existingCharacters;
      }
    }
    
    // If no existing characters, generate them
    if (characters.length === 0) {
      // Character generation code...
      // This would be a loop through characterCount with AI calls to generate each character
      
      // Simulate character generation for now
      for (let i = 0; i < characterCount; i++) {
        await updateSectionProgress(mysteryId, `Generating Character ${i+1}/${characterCount}`, 35 + Math.floor((i+1) * 25 / characterCount));
        // In a real implementation, this would call the AI to generate each character
        // Example:
        // const character = await getAIResponse(...);
        // characters.push(character);
      }
      
      // For demonstration, create mock characters
      if (testMode) {
        characters = Array(characterCount).fill(null).map((_, i) => ({
          id: `mock-${i}`,
          package_id: existingPackage?.id || "",
          character_name: `Character ${i+1}`,
          description: "Test character description",
          background: "Test character background",
          relationships: [],
          secrets: ["A test secret"],
          introduction: "Test introduction",
          whereabouts: "Test whereabouts",
          round1_statement: "Test round 1 statement",
          round2_statement: "Test round 2 statement",
          round3_statement: "Test round 3 statement",
          questioning_options: [],
          round_scripts: {
            introduction: "Test introduction",
            round1: "Test round 1",
            round2: { innocent: "Test innocent R2", guilty: "Test guilty R2", accomplice: "Test accomplice R2" },
            round3: { innocent: "Test innocent R3", guilty: "Test guilty R3", accomplice: "Test accomplice R3" },
            final: { innocent: "Test innocent final", guilty: "Test guilty final", accomplice: "Test accomplice final" }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
      }
    }
    
    // Add character content to full content
    for (const character of characters) {
      fullContent += `# ${character.character_name} - CHARACTER GUIDE\n\n`;
      fullContent += `## CHARACTER DESCRIPTION\n${character.description}\n\n`;
      fullContent += `## BACKGROUND\n${character.background}\n\n`;
      // Add other character details to the content
    }
    
    // Save characters and update progress
    if (characters.length > 0 && existingPackage?.id) {
      // Save characters to database
      for (const character of characters) {
        if (!character.id || character.id.startsWith('mock-')) {
          // Insert new character
          await supabase.from("mystery_characters").insert({
            package_id: existingPackage.id,
            character_name: character.character_name,
            description: character.description,
            background: character.background,
            relationships: character.relationships,
            secrets: character.secrets,
            introduction: character.introduction,
            whereabouts: character.whereabouts,
            round1_statement: character.round1_statement,
            round2_statement: character.round2_statement,
            round3_statement: character.round3_statement,
            questioning_options: character.questioning_options,
            round_scripts: character.round_scripts
          });
        }
      }
    }
    
    await updateSectionProgress(mysteryId, "Character Guides completed", 60, characters);
    
    // Generate Clues and Evidence
    await updateSectionProgress(mysteryId, "Generating Clues and Evidence", 65);
    
    // Check for existing evidence cards first
    let evidenceCards = existingPackage?.evidence_cards || [];
    if (evidenceCards.length === 0) {
      // Generate evidence cards
      // This would call the AI to generate evidence cards
      
      // For demonstration, create mock cards
      if (testMode) {
        evidenceCards = Array(5).fill(null).map((_, i) => ({
          title: `Evidence ${i+1}`,
          content: `Test evidence content for item ${i+1}`,
          description: `Test description for evidence ${i+1}`,
          implication: `This implies something about the case.`
        }));
      }
    }
    
    // Add evidence to full content
    for (const card of evidenceCards) {
      fullContent += `# EVIDENCE: ${card.title}\n\n${card.content}\n\n`;
    }
    
    // Save evidence cards and update progress
    await supabase
      .from("mystery_packages")
      .update({
        evidence_cards: evidenceCards,
        content: fullContent,
        progress: 80
      })
      .eq("conversation_id", mysteryId);
      
    await updateSectionProgress(mysteryId, "Clues and Evidence completed", 80, evidenceCards);
    
    // Generate Detective Script
    await updateSectionProgress(mysteryId, "Generating Detective Script", 85);
    
    // Check for existing detective script first
    let detectiveScript = existingPackage?.detective_script || "";
    if (!detectiveScript) {
      // Generate detective script
      // This would call the AI to generate the detective script
      
      // For demonstration, create mock script
      if (testMode) {
        detectiveScript = "# DETECTIVE SCRIPT\n\nThis is a test detective script for the mystery.";
      }
    }
    
    fullContent += detectiveScript + "\n\n";
    
    // Save detective script and update progress
    await supabase
      .from("mystery_packages")
      .update({
        detective_script: detectiveScript,
        content: fullContent,
        progress: 90
      })
      .eq("conversation_id", mysteryId);
      
    await updateSectionProgress(mysteryId, "Detective Script completed", 90, detectiveScript);
    
    // Generate Character Matrix
    await updateSectionProgress(mysteryId, "Generating Character Relationship Matrix", 95);
    
    // Check for existing relationship matrix first
    let relationshipMatrix = existingPackage?.relationship_matrix || "";
    if (!relationshipMatrix) {
      // Generate relationship matrix
      // This would call the AI to generate the relationship matrix
      
      // For demonstration, create mock matrix
      if (testMode) {
        relationshipMatrix = "# CHARACTER RELATIONSHIP MATRIX\n\n| Character | Relation to Victim | Motive | Alibi |\n|-----------|-------------------|--------|-------|\n";
        for (let i = 0; i < characters.length; i++) {
          relationshipMatrix += `| ${characters[i].character_name} | Unknown | None | Weak |\n`;
        }
      }
    }
    
    fullContent += relationshipMatrix + "\n\n";
    
    // Save relationship matrix and update progress
    await supabase
      .from("mystery_packages")
      .update({
        relationship_matrix: relationshipMatrix,
        content: fullContent,
        progress: 100,
        status: "completed"
      })
      .eq("conversation_id", mysteryId);
      
    await updateSectionProgress(mysteryId, "Generation complete", 100, relationshipMatrix);
    
    // Update conversation status
    await supabase
      .from("conversations")
      .update({
        has_complete_package: true,
        status: "purchased",
        is_purchased: true,
        display_status: "purchased"
      })
      .eq("id", mysteryId);
    
    // Clear generation state now that we're done
    clearGenerationState(mysteryId);
    
    return fullContent;
  } catch (error) {
    console.error("Error generating package content:", error);
    
    // Update status to failed but resumable
    await supabase
      .from("mystery_packages")
      .update({
        status: "failed",
        error_message: error.message,
        is_resumable: true
      })
      .eq("conversation_id", mysteryId);
      
    // Save error state
    const existingState = getGenerationState(mysteryId) || {};
    saveGenerationState(mysteryId, {
      ...existingState,
      error: error.message,
      generationStatus: {
        ...existingState.generationStatus,
        status: "failed",
        error: error.message,
        resumable: true
      }
    });
    
    throw error;
  }
};

const mockGeneratePackage = async (mysteryId: string): Promise<string> => {
  // This is a mock implementation for testing UI
  // In a real implementation, this would be replaced with AI generation
  
  const mockContent = `# Mock Mystery - HOST GUIDE

## OVERVIEW
This is a mock mystery package for testing UI.

## SETUP
Just a test setup.

# Character 1 - CHARACTER GUIDE

## CHARACTER DESCRIPTION
Test character description

# EVIDENCE: Test Evidence

This is test evidence.

# DETECTIVE SCRIPT

This is a test detective script.

# CHARACTER RELATIONSHIP MATRIX

| Character | Relation | Motive |
|-----------|----------|--------|
| Character 1 | None | None |
`;

  // Simulate the async nature of generation
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Update the package to completed
  await supabase
    .from("mystery_packages")
    .update({
      content: mockContent,
      status: "completed",
      progress: 100
    })
    .eq("conversation_id", mysteryId);
    
  // Update conversation
  await supabase
    .from("conversations")
    .update({
      has_complete_package: true,
      status: "purchased",
      is_purchased: true,
      display_status: "purchased"
    })
    .eq("id", mysteryId);
    
  // Clear any generation state
  clearGenerationState(mysteryId);
  
  return mockContent;
};
