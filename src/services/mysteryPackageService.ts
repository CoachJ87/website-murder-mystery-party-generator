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

// New function to save structured package data from JSON response
export async function saveStructuredPackageData(mysteryId: string, jsonData: any): Promise<void> {
  try {
    console.log("Saving structured package data for mystery:", mysteryId);
    
    // Validate required fields
    if (!jsonData.title || !jsonData.gameOverview || !jsonData.hostGuide || !Array.isArray(jsonData.characters)) {
      throw new Error("Missing required fields: title, gameOverview, hostGuide, or characters array");
    }
    
    console.log("Validation passed, proceeding with data save");
    
    // Get the package ID for this conversation
    const { data: packageData, error: packageError } = await supabase
      .from("mystery_packages")
      .select("id")
      .eq("conversation_id", mysteryId)
      .maybeSingle();
    
    if (packageError) {
      console.error("Error fetching package:", packageError);
      throw new Error("Failed to fetch package record");
    }
    
    if (!packageData) {
      throw new Error("No package record found for this conversation");
    }
    
    const packageId = packageData.id;
    
    // Upsert mystery_packages table with field mapping
    const { error: upsertError } = await supabase
      .from("mystery_packages")
      .update({
        title: jsonData.title,
        game_overview: jsonData.gameOverview,
        host_guide: jsonData.hostGuide,
        materials: jsonData.materials || null,
        preparation_instructions: jsonData.preparation || null,
        timeline: jsonData.timeline || null,
        hosting_tips: jsonData.hostingTips || null,
        evidence_cards: jsonData.evidenceCards ? JSON.stringify(jsonData.evidenceCards) : null,
        relationship_matrix: jsonData.relationshipMatrix ? JSON.stringify(jsonData.relationshipMatrix) : null,
        detective_script: jsonData.detectiveScript || null,
        generation_status: {
          status: 'completed',
          progress: 100,
          currentStep: 'Package generation completed'
        },
        generation_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", packageId);
    
    if (upsertError) {
      console.error("Error upserting package data:", upsertError);
      throw new Error("Failed to save package data");
    }
    
    console.log("Package data saved successfully");
    
    // Delete existing characters first
    const { error: deleteError } = await supabase
      .from("mystery_characters")
      .delete()
      .eq("package_id", packageId);
    
    if (deleteError) {
      console.error("Error deleting existing characters:", deleteError);
      throw new Error("Failed to delete existing characters");
    }
    
    console.log("Existing characters deleted");
    
    // Insert new characters with field mapping
    const charactersToInsert = jsonData.characters.map((char: any) => ({
      package_id: packageId,
      character_name: char.name,
      description: char.description || null,
      background: char.background || null,
      secret: char.secret || null,
      introduction: char.introduction || null,
      rumors: char.rumors || null,
      round2_questions: char.round2Questions || null,
      round2_innocent: char.round2Innocent || null,
      round2_guilty: char.round2Guilty || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    const { error: charactersError } = await supabase
      .from("mystery_characters")
      .insert(charactersToInsert);
    
    if (charactersError) {
      console.error("Error inserting characters:", charactersError);
      throw new Error("Failed to save characters data");
    }
    
    console.log(`Successfully saved ${charactersToInsert.length} characters`);
    
    // Update conversation table
    const { error: conversationError } = await supabase
      .from("conversations")
      .update({
        needs_package_generation: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", mysteryId);
    
    if (conversationError) {
      console.error("Error updating conversation:", conversationError);
      throw new Error("Failed to update conversation status");
    }
    
    console.log("Conversation updated successfully");
    console.log("Structured package data saved successfully for mystery:", mysteryId);
    
  } catch (error) {
    console.error("Error in saveStructuredPackageData:", error);
    throw error;
  }
}

// Replace the complex polling logic with this simple version
useEffect(() => {
  if (!id) return;

  let refreshInterval: number | null = null;

  const startAutoRefresh = () => {
    // Initial status check
    checkGenerationStatus();
    
    // Set up 30-second auto-refresh
    refreshInterval = window.setInterval(() => {
      console.log("Auto-refreshing generation status...");
      checkGenerationStatus();
    }, 30000); // 30 seconds
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  };

  // Start auto-refresh if generation is in progress
  if (generationStatus?.status === 'in_progress' || generating) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }

  // Cleanup on unmount
  return () => {
    stopAutoRefresh();
  };
}, [id, generationStatus?.status, generating]);

// Simplified status check function
const checkGenerationStatus = useCallback(async () => {
  if (!id) return;
  
  try {
    const status = await getPackageGenerationStatus(id);
    setGenerationStatus(status);
    setLastUpdate(new Date());
    
    // Handle completion
    if (status.status === 'completed') {
      setGenerating(false);
      
      // Fetch the completed package data
      await fetchStructuredPackageData();
      
      // Only show notification once
      if (!packageReadyNotified.current) {
        toast.success("Your mystery package is ready!");
        packageReadyNotified.current = true;
      }
      
      // Update conversation status
      await supabase
        .from("conversations")
        .update({
          status: "purchased",
          is_paid: true,
          needs_package_generation: false,
          display_status: "purchased"
        })
        .eq("id", id);
        
    } else if (status.status === 'failed') {
      setGenerating(false);
      toast.error("Generation failed. You can try again.");
    }
  } catch (error) {
    console.error("Error checking generation status:", error);
  }
}, [id]);

// Simplified generate package handler
const handleGeneratePackage = async () => {
  if (!id) {
    toast.error("Mystery ID is missing");
    return;
  }

  setGenerating(true);
  packageReadyNotified.current = false; // Reset notification flag
  
  try {
    toast.info("Starting generation of your mystery package. This will take 3-5 minutes...");
    
    // Just call the webhook - don't wait for completion
    await generateCompletePackage(id);
    
    // The auto-refresh will handle checking status
    console.log("Generation started, auto-refresh will check status");
    
  } catch (error: any) {
    console.error("Error starting package generation:", error);
    setGenerating(false);
    toast.error(error.message || "Failed to start package generation");
  }
};
    console.log(`Found conversation with ${conversation.messages?.length || 0} messages`);

    // Create or update the mystery_packages record
    const { data: packageData, error: checkError } = await supabase
      .from("mystery_packages")
      .select("id, legacy_content")
      .eq("conversation_id", mysteryId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error("Error checking for existing package:", checkError);
      throw new Error("Failed to check existing package");
    }
    
    let packageId: string;
    
    // Set proper initial status - start at 0% progress
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
    
    if (packageData) {
      packageId = packageData.id;
      
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
          legacy_content: "",
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
    
    // Save the initial state to display immediately
    await saveGenerationState(mysteryId, {
      currentlyGenerating: 'starting',
      starting: 'Starting generation...',
      generationStatus: initialStatus
    });
    
    try {
      // Format all messages into a concatenated string for easier parsing
      const conversationContent = conversation.messages
        ? conversation.messages.map((msg: any) => {
            const role = msg.role === "assistant" ? "AI" : "User";
            return `${role}: ${msg.content}`;
          }).join("\n\n---\n\n")
        : "";

      // Enhanced payload with individual conversation columns
      const webhookPayload = {
        // Core identifiers
        userId: conversation.user_id,
        conversationId: mysteryId,
        
        // Enhanced structured data using individual columns
        title: conversation.title || null,
        systemInstruction: conversation.system_instruction || null,
        
        // Message breakdown for better parsing
        messages: conversation.messages ? conversation.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at,
          is_ai: msg.is_ai || msg.role === "assistant"
        })) : [],
        
        // Legacy concatenated content (keep for backward compatibility)
        content: conversationContent,
        
        // Parsed requirements using individual columns
        playerCount: conversation.player_count || null,
        theme: conversation.theme || null,
        scriptType: conversation.script_type || 'full',
        additionalDetails: conversation.additional_details || null,
        hasAccomplice: conversation.has_accomplice || false,
        
        // Metadata
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
        promptVersion: conversation.prompt_version || null,
        
        // Processing flags
        testMode: testMode || false
      };

      console.log("Sending payload to Make.com webhook:", {
        userId: webhookPayload.userId,
        conversationId: webhookPayload.conversationId,
        contentLength: webhookPayload.content.length
      });
      
      // Update to 10% before webhook call
      const preparingStatus: GenerationStatus = {
        status: 'in_progress',
        progress: 10,
        currentStep: 'Preparing to send to external service...',
        sections: {
          hostGuide: false,
          characters: false,
          clues: false,
          inspectorScript: false,
          characterMatrix: false,
          solution: false
        }
      };
      
      await supabase
        .from("mystery_packages")
        .update({
          generation_status: preparingStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
      
      await saveGenerationState(mysteryId, {
        currentlyGenerating: 'preparing',
        preparing: 'Preparing to send to external service...',
        generationStatus: preparingStatus
      });
      
      // Call your Make.com webhook directly
      const response = await fetch("https://hook.eu2.make.com/uannnuc9hc79vorh1iyxwb9t5lp484n3", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Make.com webhook error:", response.status, errorText);
        throw new Error(`Webhook failed: ${response.status} ${errorText}`);
      }
      
      let responseData;
      try {
        responseData = await response.json();
        console.log("Make.com webhook response:", responseData);
        
        // If the response contains structured data, save it immediately
        if (responseData && typeof responseData === 'object' && responseData.title) {
          console.log("Received structured JSON response, saving data...");
          await saveStructuredPackageData(mysteryId, responseData);
          console.log("Structured data saved successfully");
          return "Package generation completed successfully";
        }
      } catch (e) {
        // If response isn't JSON, that's okay for webhooks
        console.log("Webhook responded with non-JSON (this is normal for many webhooks)");
        responseData = { success: true };
      }
      
      // Update status to "sent to external service" at 15%
      const sentStatus: GenerationStatus = {
        status: 'in_progress',
        progress: 15,
        currentStep: 'Sent to external service. Processing will take 3-5 minutes...',
        sections: {
          hostGuide: false,
          characters: false,
          clues: false,
          inspectorScript: false,
          characterMatrix: false,
          solution: false
        }
      };
      
      await supabase
        .from("mystery_packages")
        .update({
          generation_status: sentStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
      
      await saveGenerationState(mysteryId, {
        currentlyGenerating: 'externalProcessing',
        externalProcessing: 'Package generation sent to external service (3-5 minutes)...',
        generationStatus: sentStatus
      });
      
      // Update the conversation to mark that it needs package generation
      await supabase
        .from("conversations")
        .update({
          needs_package_generation: true,
          updated_at: new Date().toISOString()
        })
        .eq("id", mysteryId);
      
      console.log("Successfully sent data to Make.com webhook");
      return "Sent to external generation service";
      
    } catch (error) {
      const err = error as ServiceError;
      console.error("Error calling webhook:", err);
      
      // Update status to failed
      const failedStatus: GenerationStatus = {
        status: 'failed',
        progress: 0,
        currentStep: 'Failed to send to external service: ' + err.message,
        resumable: true
      };
      
      await supabase
        .from("mystery_packages")
        .update({
          generation_status: failedStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
      
      await saveGenerationState(mysteryId, {
        generationStatus: failedStatus
      });
      
      throw new Error(err.message || "Failed to send to external service");
    }
    
  } catch (error) {
    console.error("Error in generate complete package:", error);
    throw error;
  }
}

export async function resumePackageGeneration(mysteryId: string): Promise<string> {
  // Resume now just calls the webhook again
  return generateCompletePackage(mysteryId);
}

export async function getPackageGenerationStatus(mysteryId: string): Promise<GenerationStatus> {
  try {
    // Always get fresh status from database to ensure accuracy
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
