
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
    
    // Create or update the mystery_packages record
    const { data: packageData, error: checkError } = await supabase
      .from("mystery_packages")
      .select("id, content")
      .eq("conversation_id", mysteryId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking for existing package:", checkError);
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
      // IMPORTANT: Use environment variables, not the supabase client properties
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Call the webhook trigger edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/mystery-webhook-trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ conversationId: mysteryId, testMode })
      });
      
      if (!response.ok) {
        let errorText = "";
        try {
          const errorData = await response.json();
          errorText = errorData.error || response.statusText;
        } catch (e) {
          errorText = await response.text() || response.statusText;
        }
        
        console.error("Webhook trigger error:", errorText);
        throw new Error(`Failed to trigger webhook: ${response.status} ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log("Webhook trigger response:", responseData);
      
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
      
      // The content will be filled by the external service
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
