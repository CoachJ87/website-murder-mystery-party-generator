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
    
    // First, get the conversation data with messages
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*, messages(*), user_id")
      .eq("id", mysteryId)
      .single();

    if (conversationError || !conversation) {
      console.error("Error fetching conversation:", conversationError);
      throw new Error("Failed to fetch conversation data");
    }

    console.log(`Found conversation with ${conversation.messages?.length || 0} messages`);

    // Create or update the mystery_packages record
    const { data: packageData, error: checkError } = await supabase
      .from("mystery_packages")
      .select("id, content")
      .eq("conversation_id", mysteryId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error("Error checking for existing package:", checkError);
      throw new Error("Failed to check existing package");
    }
    
    let packageId: string;
    
    // Set initial status for display
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
    
    // Save the initial state to display immediately
    await saveGenerationState(mysteryId, {
      currentlyGenerating: 'webhook',
      webhook: 'Sending to external generation service...',
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

// Enhanced payload with all available data
const webhookPayload = {
  // Core identifiers
  userId: conversation.user_id,
  conversationId: mysteryId,
  
  // Enhanced structured data
  mysteryData: conversation.mystery_data || {},
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
  
  // Parsed requirements for easy access
  playerCount: conversation.mystery_data?.playerCount || null,
  theme: conversation.mystery_data?.theme || null,
  scriptType: conversation.mystery_data?.scriptType || 'full',
  additionalDetails: conversation.mystery_data?.additionalDetails || null,
  hasAccomplice: conversation.mystery_data?.hasAccomplice || false,
  
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
      } catch (e) {
        // If response isn't JSON, that's okay for webhooks
        console.log("Webhook responded with non-JSON (this is normal for many webhooks)");
        responseData = { success: true };
      }
      
      // Update status to "waiting for external processing"
      const waitingStatus: GenerationStatus = {
        status: 'in_progress',
        progress: 20,
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
          generation_status: waitingStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", packageId);
      
      await saveGenerationState(mysteryId, {
        currentlyGenerating: 'externalProcessing',
        externalProcessing: 'Package generation sent to external service (3-5 minutes)...',
        generationStatus: waitingStatus
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
