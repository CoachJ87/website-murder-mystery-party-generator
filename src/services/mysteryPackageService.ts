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

// Helper function to detect current domain
const getCurrentDomain = () => {
  // Client-side detection
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side detection for different environments
  if (process.env.VERCEL_URL) {
    // Vercel automatically sets this in production and preview deployments
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // Fallback to your production domain
  return 'https://murder-mystery.party';
};

// Enhanced Save structured package data with comprehensive debugging
export async function saveStructuredPackageData(mysteryId: string, jsonData: any): Promise<void> {
  console.log("🔧 [DEBUG] saveStructuredPackageData called with:");
  console.log("  - mysteryId:", mysteryId);
  console.log("  - jsonData keys:", jsonData ? Object.keys(jsonData) : "null/undefined");
  console.log("  - jsonData:", jsonData);

  try {
    // Enhanced validation with detailed logging
    if (!jsonData) {
      console.error("❌ [DEBUG] No jsonData provided");
      throw new Error("No JSON data provided");
    }
    
    if (!jsonData.title) {
      console.error("❌ [DEBUG] Missing title in jsonData");
    }
    if (!jsonData.gameOverview && !jsonData.game_overview) {
      console.error("❌ [DEBUG] Missing gameOverview/game_overview in jsonData");
    }
    if (!jsonData.hostGuide && !jsonData.host_guide) {
      console.error("❌ [DEBUG] Missing hostGuide/host_guide in jsonData");
    }
    if (!Array.isArray(jsonData.characters)) {
      console.error("❌ [DEBUG] Missing or invalid characters array in jsonData");
    }

    // Flexible field mapping to handle different data formats
    const normalizedData = {
      title: jsonData.title,
      gameOverview: jsonData.gameOverview || jsonData.game_overview,
      hostGuide: jsonData.hostGuide || jsonData.host_guide,
      materials: jsonData.materials,
      preparation: jsonData.preparation || jsonData.preparation_instructions,
      timeline: jsonData.timeline,
      hostingTips: jsonData.hostingTips || jsonData.hosting_tips,
      evidenceCards: jsonData.evidenceCards || jsonData.evidence_cards,
      relationshipMatrix: jsonData.relationshipMatrix || jsonData.relationship_matrix,
      detectiveScript: jsonData.detectiveScript || jsonData.detective_script,
      characters: jsonData.characters || []
    };

    console.log("✅ [DEBUG] Normalized data:", normalizedData);

    // Get the package ID for this conversation with enhanced error handling
    console.log("🔍 [DEBUG] Fetching package for conversation:", mysteryId);
    const { data: packageData, error: packageError } = await supabase
      .from("mystery_packages")
      .select("id")
      .eq("conversation_id", mysteryId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (packageError) {
      console.error("❌ [DEBUG] Error fetching package:", packageError);
      throw new Error(`Failed to fetch package record: ${packageError.message}`);
    }
    
    if (!packageData) {
      console.log("ℹ️ [DEBUG] No existing package found, creating new one");
      
      // Create new package if none exists
      const { data: newPackage, error: createError } = await supabase
        .from("mystery_packages")
        .insert({
          conversation_id: mysteryId,
          title: normalizedData.title,
          game_overview: normalizedData.gameOverview,
          host_guide: normalizedData.hostGuide,
          materials: normalizedData.materials || null,
          preparation_instructions: normalizedData.preparation || null,
          timeline: normalizedData.timeline || null,
          hosting_tips: normalizedData.hostingTips || null,
          evidence_cards: normalizedData.evidenceCards || null,
          relationship_matrix: normalizedData.relationshipMatrix || null,
          detective_script: normalizedData.detectiveScript || null,
          generation_status: {
            status: 'completed',
            progress: 100,
            currentStep: 'Package generation completed'
          },
          generation_completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select("id")
        .single();
        
      if (createError || !newPackage) {
        console.error("❌ [DEBUG] Error creating package:", createError);
        throw new Error(`Failed to create package record: ${createError?.message}`);
      }
      
      var packageId = newPackage.id;
      console.log("✅ [DEBUG] Created new package with ID:", packageId);
    } else {
      var packageId = packageData.id;
      console.log("✅ [DEBUG] Found existing package with ID:", packageId);

      // Update existing mystery_packages table with structured data
      const { error: upsertError } = await supabase
        .from("mystery_packages")
        .update({
          title: normalizedData.title,
          game_overview: normalizedData.gameOverview,
          host_guide: normalizedData.hostGuide,
          materials: normalizedData.materials || null,
          preparation_instructions: normalizedData.preparation || null,
          timeline: normalizedData.timeline || null,
          hosting_tips: normalizedData.hostingTips || null,
          evidence_cards: normalizedData.evidenceCards || null,
          relationship_matrix: normalizedData.relationshipMatrix || null,
          detective_script: normalizedData.detectiveScript || null,
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
        console.error("❌ [DEBUG] Error updating package data:", upsertError);
        throw new Error(`Failed to save package data: ${upsertError.message}`);
      }
      
      console.log("✅ [DEBUG] Package data updated successfully");
    }
    
    // Handle characters if provided
    if (Array.isArray(normalizedData.characters) && normalizedData.characters.length > 0) {
      console.log(`🔍 [DEBUG] Processing ${normalizedData.characters.length} characters`);
      
      // Delete existing characters first
      const { error: deleteError } = await supabase
        .from("mystery_characters")
        .delete()
        .eq("package_id", packageId);
      
      if (deleteError) {
        console.error("❌ [DEBUG] Error deleting existing characters:", deleteError);
        throw new Error(`Failed to delete existing characters: ${deleteError.message}`);
      }
      
      console.log("✅ [DEBUG] Existing characters deleted");
      
      // Insert new characters
      const charactersToInsert = normalizedData.characters.map((char: any) => ({
        package_id: packageId,
        character_name: char.name || char.character_name,
        description: char.description || null,
        background: char.background || null,
        secret: char.secret || null,
        introduction: char.introduction || null,
        rumors: char.rumors || null,
        round2_questions: char.round2Questions || char.round2_questions || null,
        round2_innocent: char.round2Innocent || char.round2_innocent || null,
        round2_guilty: char.round2Guilty || char.round2_guilty || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      console.log("🔍 [DEBUG] Characters to insert:", charactersToInsert);
      
      const { error: charactersError } = await supabase
        .from("mystery_characters")
        .insert(charactersToInsert);
      
      if (charactersError) {
        console.error("❌ [DEBUG] Error inserting characters:", charactersError);
        throw new Error(`Failed to save characters data: ${charactersError.message}`);
      }
      
      console.log(`✅ [DEBUG] Successfully saved ${charactersToInsert.length} characters`);
    } else {
      console.log("ℹ️ [DEBUG] No characters provided or empty array");
    }
    
    // Update conversation table
    console.log("🔍 [DEBUG] Updating conversation status");
    const { error: conversationError } = await supabase
      .from("conversations")
      .update({
        needs_package_generation: false,
        has_complete_package: true,
        is_paid: true,
        display_status: "purchased",
        updated_at: new Date().toISOString()
      })
      .eq("id", mysteryId);
    
    if (conversationError) {
      console.error("❌ [DEBUG] Error updating conversation:", conversationError);
      throw new Error(`Failed to update conversation status: ${conversationError.message}`);
    }
    
    console.log("✅ [DEBUG] Conversation updated successfully");
    console.log("🎉 [DEBUG] saveStructuredPackageData completed successfully for mystery:", mysteryId);
    
  } catch (error) {
    console.error("❌ [DEBUG] Error in saveStructuredPackageData:", error);
    throw error;
  }
}

// Enhanced package generation with domain detection
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
      .order('updated_at', { ascending: false })
      .limit(1)
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

    // Prepare conversation content
    const conversationContent = conversation.messages
      ? conversation.messages.map((msg: any) => {
          const role = msg.role === "assistant" ? "AI" : "User";
          return `${role}: ${msg.content}`;
        }).join("\n\n---\n\n")
      : "";

    // Detect current domain for callback
    const currentDomain = getCurrentDomain();
    console.log("Detected domain for webhook callback:", currentDomain);

    // Enhanced webhook payload with callback information
    const webhookPayload = {
      userId: conversation.user_id,
      conversationId: mysteryId,
      
      // NEW: Add callback domain and URL for webhook response
      callback_domain: currentDomain,
      callback_url: `${currentDomain}/api/generation-complete`,
      environment: process.env.NODE_ENV || 'production',
      
      // Existing payload fields
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

    console.log("=== ENHANCED WEBHOOK PAYLOAD DEBUG ===");
    console.log("Conversation ID:", webhookPayload.conversationId);
    console.log("User ID:", webhookPayload.userId);
    console.log("Callback Domain:", webhookPayload.callback_domain);
    console.log("Callback URL:", webhookPayload.callback_url);
    console.log("Environment:", webhookPayload.environment);
    console.log("Messages count:", webhookPayload.messages?.length || 0);
    console.log("Theme:", webhookPayload.theme);
    console.log("Player count:", webhookPayload.playerCount);
    console.log("Test Mode:", webhookPayload.testMode);
    console.log("Payload size (chars):", JSON.stringify(webhookPayload).length);
    console.log("=== END ENHANCED WEBHOOK PAYLOAD DEBUG ===");

    console.log("Sending enhanced payload to Make.com webhook");

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

    console.log("Successfully sent enhanced data to Make.com webhook with callback URL");
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

// Enhanced Get generation status with better error handling
export async function getPackageGenerationStatus(mysteryId: string): Promise<GenerationStatus> {
  console.log("🔍 [DEBUG] getPackageGenerationStatus called for:", mysteryId);
  
  try {
    const { data, error } = await supabase
      .from("mystery_packages")
      .select("generation_status")
      .eq("conversation_id", mysteryId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error("❌ [DEBUG] Error fetching generation status:", error);
      throw new Error(`Failed to fetch generation status: ${error.message}`);
    }
    
    console.log("📊 [DEBUG] Raw generation status data:", data);
    
    if (!data || !data.generation_status) {
      console.log("ℹ️ [DEBUG] No generation status found, returning default");
      const defaultStatus = {
        status: 'not_started' as const,
        progress: 0,
        currentStep: 'Not started',
        sections: {}
      };
      console.log("📊 [DEBUG] Returning default status:", defaultStatus);
      return defaultStatus;
    }
    
    const status = data.generation_status as GenerationStatus;
    console.log("✅ [DEBUG] Returning generation status:", status);
    return status;
  } catch (error) {
    console.error("❌ [DEBUG] Error in getPackageGenerationStatus:", error);
    throw error;
  }
}
