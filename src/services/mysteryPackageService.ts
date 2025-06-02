

import { supabase } from "@/lib/supabase";
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
    [key: string]: boolean | undefined;
  };
}

// Save structured package data from JSON response
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
    
    // Update mystery_packages table with structured data
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
    
    // Insert new characters
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
    
    console.log("Structured package data saved successfully for mystery:", mysteryId);
    
  } catch (error) {
    console.error("Error in saveStructuredPackageData:", error);
    throw error;
  }
}

// Simplified package generation - just send webhook and update status
export async function generateCompletePackage(mysteryId: string, testMode = false): Promise<string> {
  try {
    console.log("Starting package generation for conversation ID:", mysteryId);
    
    // Get conversation data
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*, messages(*), user_id, theme, player_count, script_type, has_accomplice, additional_details")
      .eq("id", mysteryId)
      .single();

    if (conversationError || !conversation) {
      console.error("Error fetching conversation:", conversationError);
      throw new Error("Failed to fetch conversation data");
    }

    console.log(`Found conversation with ${conversation.messages?.length || 0} messages`);

    // Create or update mystery_packages record with initial status
    const { data: packageData, error: checkError } = await supabase
      .from("mystery_packages")
      .select("id")
      .eq("conversation_id", mysteryId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking for existing package:", checkError);
      throw new Error("Failed to check existing package");
    }
    
    let packageId: string;
    
    const initialStatus: GenerationStatus = {
      status: 'in_progress',
      progress: 10,
      currentStep: 'Sending to external generation service...',
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
      await supabase
        .from("mystery_packages")
        .update({
          generation_status: initialStatus,
          generation_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
    } else {
      const { data: newPackage, error: createError } = await supabase
        .from("mystery_packages")
        .insert({
          conversation_id: mysteryId,
          legacy_content: "",
          generation_status: initialStatus,
          generation_started_at: new Date().toISOString(),
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

    // Prepare webhook payload
    const conversationContent = conversation.messages
      ? conversation.messages.map((msg: any) => {
          const role = msg.role === "assistant" ? "AI" : "User";
          return `${role}: ${msg.content}`;
        }).join("\n\n---\n\n")
      : "";

    const webhookPayload = {
      userId: conversation.user_id,
      conversationId: mysteryId,
      title: conversation.title || null,
      systemInstruction: conversation.system_instruction || null,
      messages: conversation.messages ? conversation.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        is_ai: msg.is_ai || msg.role === "assistant"
      })) : [],
      content: conversationContent,
      playerCount: conversation.player_count || null,
      theme: conversation.theme || null,
      scriptType: conversation.script_type || 'full',
      additionalDetails: conversation.additional_details || null,
      hasAccomplice: conversation.has_accomplice || false,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      testMode: testMode || false
    };

    console.log("=== WEBHOOK PAYLOAD DEBUG ===");
    console.log("Conversation ID:", webhookPayload.conversationId);
    console.log("User ID:", webhookPayload.userId);
    console.log("Messages count:", webhookPayload.messages?.length || 0);
    console.log("Theme:", webhookPayload.theme);
    console.log("Player count:", webhookPayload.playerCount);
    console.log("Payload size (chars):", JSON.stringify(webhookPayload).length);
    console.log("=== END WEBHOOK PAYLOAD DEBUG ===");

    console.log("Sending payload to Make.com webhook");

    // Send to Make.com webhook
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
      
      // Update status to failed
      await supabase
        .from("mystery_packages")
        .update({
          generation_status: {
            status: 'failed',
            progress: 0,
            currentStep: 'Failed to send to external service: ' + errorText,
            resumable: true
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
        
      throw new Error(`Webhook failed: ${response.status} ${errorText}`);
    }

    // Check if we got structured JSON response (immediate completion)
    let responseData;
    try {
      responseData = await response.json();
      console.log("Make.com webhook response:", responseData);
      
      if (responseData && typeof responseData === 'object' && responseData.title) {
        console.log("Received structured JSON response, saving data...");
        await saveStructuredPackageData(mysteryId, responseData);
        console.log("Structured data saved successfully");
        return "Package generation completed successfully";
      }
    } catch (e) {
      console.log("Webhook responded with non-JSON (normal for async webhooks)");
    }

    // Update status to "processing" - the webhook will update when complete
    await supabase
      .from("mystery_packages")
      .update({
        generation_status: {
          status: 'in_progress',
          progress: 20,
          currentStep: 'Package generation in progress (3-5 minutes)...',
          sections: {
            hostGuide: false,
            characters: false,
            clues: false,
            inspectorScript: false,
            characterMatrix: false,
            solution: false
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq("id", packageId);

    // Update conversation to mark that generation is in progress
    await supabase
      .from("conversations")
      .update({
        needs_package_generation: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", mysteryId);

    console.log("Successfully sent data to Make.com webhook");
    return "Webhook sent - generation in progress";
    
  } catch (error) {
    console.error("Error in generateCompletePackage:", error);
    throw error;
  }
}

// Simplified resume function - just calls generate again
export async function resumePackageGeneration(mysteryId: string): Promise<string> {
  console.log("Resuming package generation by calling generateCompletePackage");
  return generateCompletePackage(mysteryId);
}

// Get generation status from database
export async function getPackageGenerationStatus(mysteryId: string): Promise<GenerationStatus> {
  try {
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
