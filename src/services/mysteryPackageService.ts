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
          round2_accomplice: char.round2Accomplice || char.round2_accomplice || null, // ADD
          round3_questions: char.round3Questions || char.round3_questions || null,
          round3_innocent: char.round3Innocent || char.round3_innocent || null,
          round3_guilty: char.round3Guilty || char.round3_guilty || null,
          round3_accomplice: char.round3Accomplice || char.round3_accomplice || null, // ADD
          round4_questions: char.round4Questions || char.round4_questions || null,
          round4_innocent: char.round4Innocent || char.round4_innocent || null,
          round4_guilty: char.round4Guilty || char.round4_guilty || null,
          round4_accomplice: char.round4Accomplice || char.round4_accomplice || null, // ADD
          final_innocent: char.finalInnocent || char.final_innocent || null,
          final_guilty: char.finalGuilty || char.final_guilty || null,
          final_accomplice: char.finalAccomplice || char.final_accomplice || null, // ADD
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
    
    // Prevent duplicate generation attempts
    const { data: existingPackage, error: existingPackageErr } = await supabase
      .from("mystery_packages")
      .select("generation_status, generation_started_at")
      .eq("conversation_id", mysteryId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (existingPackageErr) {
      console.error("Error checking for existing generation:", existingPackageErr);
    } else if (existingPackage?.generation_status?.status === 'in_progress') {
      console.warn("Generation already in progress – aborting duplicate webhook call");
      return "already_in_progress";
    }
    
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

    // Format messages to ensure they match the expected structure
    const formattedMessages = conversation.messages 
      ? conversation.messages.map(msg => ({
          role: msg.role || 'user',
          content: String(msg.content || '')
        }))
      : [];

    // Flatten the payload structure for Make.com compatibility
    const webhookPayload = {
      // Required parameters at root level
      model: "claude-3-sonnet-20240229",
      max_tokens: 4000,
      // Provide messages as JSON string to maintain flat structure while meeting required param
      messages: JSON.stringify(formattedMessages),
      
      // Flatten messages array into individual parameters
      message_count: conversation.messages?.length || 0,
      message_1_role: conversation.messages?.[0]?.role || "user",
      message_1_content: conversation.messages?.[0]?.content || "",
      message_2_role: conversation.messages?.[1]?.role || "",
      message_2_content: conversation.messages?.[1]?.content || "",
      
      // All other data as flat parameters
      userId: conversation.user_id,
      conversationId: mysteryId,
      callback_domain: currentDomain,
      callback_url: `${currentDomain}/api/generation-complete`,
      environment: process.env.NODE_ENV || 'production',
      title: conversation.title || null,
      content: conversationContent,
      playerCount: conversation.player_count || null,
      theme: conversation.theme || null,
      scriptType: conversation.script_type || 'full',
      hasAccomplice: conversation.has_accomplice || false,
      testMode: testMode || false
    };

    // Debug logging of the final payload
    console.log('=== WEBHOOK PAYLOAD DEBUG ===');
    console.log('Payload being sent to Make.com:', JSON.stringify(webhookPayload, null, 2));
    console.log('=== END WEBHOOK PAYLOAD ===');
    
    // Log individual parameter verification
    console.log('=== PARAMETER VERIFICATION ===');
    console.log('model exists:', 'model' in webhookPayload);
    console.log('max_tokens exists:', 'max_tokens' in webhookPayload);
    console.log('messages exists:', 'messages' in webhookPayload);
    console.log('message_count:', webhookPayload.message_count);
    console.log('message_1_role exists:', 'message_1_role' in webhookPayload);
    console.log('message_1_content exists:', 'message_1_content' in webhookPayload);
    console.log('=== END PARAMETER VERIFICATION ===');

    // Log the final payload being sent
    console.log('=== FINAL PAYLOAD ===');
    console.log(JSON.stringify(webhookPayload, null, 2));
    console.log('=== END FINAL PAYLOAD ===');

    // Log request details before making the call
    console.log("=== WEBHOOK REQUEST DEBUG ===");
    console.log("Making request to:", "https://hook.eu2.make.com/rvbxk8barcrchw5vops26fp8zqv14kxp");
    console.log("Payload size:", JSON.stringify(webhookPayload).length, "characters");
    console.log("Request headers:", { 'Content-Type': 'application/json' });
    console.log("=== END WEBHOOK REQUEST DEBUG ===");

    // Helper function to send webhook with different content types
    const sendWebhook = async (contentType: 'json' | 'form' | 'formData') => {
      let headers: Record<string, string> = {};
      let body: string | FormData;
      
      if (contentType === 'json') {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(webhookPayload);
      } else if (contentType === 'form') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        const formData = new URLSearchParams();
        Object.entries(webhookPayload).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        });
        body = formData.toString();
      } else {
        // formData (multipart/form-data)
        const formData = new FormData();
        Object.entries(webhookPayload).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (typeof value === 'object' && !(value instanceof File)) {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, value as any);
            }
          }
        });
        body = formData;
      }

      console.log(`=== SENDING WEBHOOK (${contentType}) ===`);
      console.log('Headers:', headers);
      console.log('Body:', body);
      
      try {
        const response = await fetch("https://hook.eu2.make.com/rvbxk8barcrchw5vops26fp8zqv14kxp", {
          method: 'POST',
          headers: headers,
          body: body as BodyInit
        });
        
        console.log(`=== WEBHOOK RESPONSE (${contentType}) ===`);
        console.log('Status:', response.status, response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('Response:', responseText);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${responseText}`);
        }
        
        return { success: true, response: responseText };
      } catch (error) {
        console.error(`Webhook error (${contentType}):`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error),
          contentType
        };
      }
    };
    
    // Try different content types in sequence
    const contentTypes = ['json', 'form', 'formData'] as const;
    let lastError: Error | string = '';
    
    for (const contentType of contentTypes) {
      console.log(`\n=== TRYING CONTENT TYPE: ${contentType} ===`);
      const result = await sendWebhook(contentType);
      
      if (result.success) {
        console.log(`✓ Successfully sent with ${contentType}`);
        // Update status to indicate webhook was sent successfully
        await supabase
          .from("mystery_packages")
          .update({
            generation_status: {
              status: 'in_progress',
              progress: 20,
              currentStep: 'Processing by external service...'
            },
            updated_at: new Date().toISOString()
          })
          .eq("id", packageId);
          
        return "Package generation started successfully";
      } else {
        lastError = result.error || 'Unknown error';
        console.warn(`✗ Failed with ${contentType}:`, lastError);
      }
    }
    
    // If we get here, all content types failed
    console.error("=== ALL WEBHOOK ATTEMPTS FAILED ===");
    console.error("Last error:", lastError);
    
    // Update status to failed
    await supabase
      .from("mystery_packages")
      .update({
        generation_status: {
          status: 'failed',
          progress: 0,
          currentStep: 'Failed to send to external service',
          error: String(lastError),
          resumable: true
        },
        updated_at: new Date().toISOString()
      })
      .eq("id", packageId);
      
    throw new Error(`All webhook attempts failed. Last error: ${lastError}`);
  } catch (e) {
    console.error("Unexpected error in generateCompletePackage:", e);
    
    // Update status to failed with error details
    await supabase
      .from("mystery_packages")
      .update({
        generation_status: {
          status: 'failed',
          progress: 0,
          currentStep: 'Unexpected error during generation',
          error: e instanceof Error ? e.message : String(e),
          resumable: true
        },
        updated_at: new Date().toISOString()
      })
      .eq("id", packageId);
      
    throw new Error(`Package generation failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  
  // If we get here, the webhook was sent successfully
  return "Package generation started successfully";
}

// Simplified resume function - just calls generate again
export async function resumePackageGeneration(mysteryId: string): Promise<string> {
  console.log("Resuming package generation by calling generateCompletePackage");
  return generateCompletePackage(mysteryId);
}

// Enhanced Get generation status with content-based completion detection
export async function getPackageGenerationStatus(mysteryId: string): Promise<GenerationStatus> {
  console.log("🔍 [STATUS CHECK] getPackageGenerationStatus called for:", mysteryId);
  
  try {
    // Enhanced database query to include content fields and character count
    const { data, error } = await supabase
      .from("mystery_packages")
      .select(`
        generation_status, 
        generation_completed_at, 
        generation_started_at,
        title,
        host_guide,
        characters:mystery_characters(count)
      `)
      .eq("conversation_id", mysteryId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error("❌ [STATUS CHECK] Error fetching generation status:", error);
      throw new Error(`Failed to fetch generation status: ${error.message}`);
    }
    
    console.log("📊 [STATUS CHECK] Raw package data received:", data);
    
    if (!data) {
      console.log("ℹ️ [STATUS CHECK] No mystery package found, returning default not_started status");
      const defaultStatus = {
        status: 'not_started' as const,
        progress: 0,
        currentStep: 'Not started',
        sections: {}
      };
      console.log("📊 [STATUS CHECK] Returning default status:", defaultStatus);
      return defaultStatus;
    }
    
    // Content-based completion detection
    const hasContent = !!(data.title && data.host_guide);
    const hasCharacters = !!(data.characters && data.characters.length > 0);
    const contentComplete = hasContent && hasCharacters;
    
    console.log("🔍 [STATUS CHECK] Content check results:");
    console.log("  - Has title and host_guide:", hasContent);
    console.log("  - Has characters:", hasCharacters, `(count: ${data.characters?.length || 0})`);
    console.log("  - Content complete:", contentComplete);
    
    // Check current status in database
    let currentStatus = data.generation_status;
    console.log("📊 [STATUS CHECK] Current database status:", currentStatus);
    
    // Auto-correction logic: if content exists but status is wrong, correct it
    if (contentComplete && currentStatus && currentStatus.status !== 'completed') {
      console.log("🔧 [STATUS CHECK] Content exists but status is not 'completed', auto-correcting...");
      
      const completedStatus = {
        status: 'completed' as const,
        progress: 100,
        currentStep: 'Package generation completed',
        sections: {
          hostGuide: true,
          characters: true,
          clues: true,
          inspectorScript: true,
          characterMatrix: true
        }
      };
      
      // Update the database with corrected status
      const { error: updateError } = await supabase
        .from("mystery_packages")
        .update({
          generation_status: completedStatus,
          generation_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("conversation_id", mysteryId);
      
      if (updateError) {
        console.error("❌ [STATUS CHECK] Error updating corrected status:", updateError);
      } else {
        console.log("✅ [STATUS CHECK] Status auto-corrected to 'completed'");
        currentStatus = completedStatus;
      }
    }
    
    // Check if generation_status exists and is valid
    if (!currentStatus || typeof currentStatus !== 'object') {
      console.log("ℹ️ [STATUS CHECK] No valid generation_status found, checking completion dates and content");
      
      // Fallback: check completion dates and content to determine status
      if (data.generation_completed_at || contentComplete) {
        const completedStatus = {
          status: 'completed' as const,
          progress: 100,
          currentStep: 'Package generation completed',
          sections: {
            hostGuide: true,
            characters: true,
            clues: true,
            inspectorScript: true,
            characterMatrix: true
          }
        };
        console.log("✅ [STATUS CHECK] Inferring completed status from completion date or content:", completedStatus);
        return completedStatus;
      } else if (data.generation_started_at) {
        const inProgressStatus = {
          status: 'in_progress' as const,
          progress: 50,
          currentStep: 'Package generation in progress...',
          sections: {}
        };
        console.log("🔄 [STATUS CHECK] Inferring in_progress status from start date:", inProgressStatus);
        return inProgressStatus;
      }
      
      // No dates found, return not started
      const notStartedStatus = {
        status: 'not_started' as const,
        progress: 0,
        currentStep: 'Not started',
        sections: {}
      };
      console.log("📊 [STATUS CHECK] No dates found, returning not_started:", notStartedStatus);
      return notStartedStatus;
    }
    
    const status = currentStatus as GenerationStatus;
    console.log("✅ [STATUS CHECK] Returning generation status:", status);
    
    // Ensure status has all required fields
    const normalizedStatus: GenerationStatus = {
      status: status.status || 'not_started',
      progress: status.progress || 0,
      currentStep: status.currentStep || 'Unknown step',
      resumable: status.resumable,
      sections: status.sections || {}
    };
    
    console.log("📊 [STATUS CHECK] Normalized status:", normalizedStatus);
    return normalizedStatus;
  } catch (error) {
    console.error("❌ [STATUS CHECK] Error in getPackageGenerationStatus:", error);
    
    // Return a safe fallback status on error
    const errorStatus = {
      status: 'not_started' as const,
      progress: 0,
      currentStep: 'Error checking status',
      sections: {}
    };
    console.log("📊 [STATUS CHECK] Returning error fallback status:", errorStatus);
    return errorStatus;
  }
}
