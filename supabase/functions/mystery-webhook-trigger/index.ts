
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const webhookUrl = "https://hook.eu2.make.com/uannnuc9hc79vorh1iyxwb9t5lp484n3";

    // Parse request body
    const requestData = await req.json();
    const { conversationId, testMode = false } = requestData;
    
    console.log(`Processing webhook trigger for conversation: ${conversationId}, testMode: ${testMode}`);

    if (!conversationId) {
      return new Response(JSON.stringify({ error: "Conversation ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if mystery is paid or should be processed for test mode
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*, is_paid, display_status")
      .eq("id", conversationId)
      .single();

    if (conversationError) {
      console.error("Error fetching conversation:", conversationError);
      return new Response(JSON.stringify({ error: "Failed to fetch conversation data" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only proceed if the mystery is paid or in test mode
    if (!conversation.is_paid && conversation.display_status !== "purchased" && !testMode) {
      console.error("Cannot generate package for unpaid mystery without test mode");
      return new Response(JSON.stringify({ 
        error: "This mystery requires purchase before generating a complete package",
        requiresPurchase: true
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the conversation with all messages
    const { data: fullConversation, error: fullConversationError } = await supabase
      .from("conversations")
      .select("*, messages(*), system_instruction")
      .eq("id", conversationId)
      .single();

    if (fullConversationError) {
      console.error("Error fetching full conversation:", fullConversationError);
      return new Response(JSON.stringify({ error: "Failed to fetch complete conversation data with messages" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update conversation to indicate package generation is in progress
    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        needs_package_generation: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", conversationId);

    if (updateError) {
      console.error("Error updating conversation:", updateError);
      // Continue despite error, as this is not critical
    }

    // Send data to Make.com webhook
    console.log(`Sending data to webhook for conversation: ${conversationId}`);
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        conversationId,
        conversation: fullConversation,
        timestamp: new Date().toISOString(),
        testMode
      })
    });

    if (!webhookResponse.ok) {
      let webhookErrorText = "";
      try {
        const errorData = await webhookResponse.json();
        webhookErrorText = errorData.error || webhookResponse.statusText;
      } catch (e) {
        webhookErrorText = await webhookResponse.text() || webhookResponse.statusText;
      }
      
      console.error("Webhook error:", webhookErrorText);
      throw new Error(`Webhook returned ${webhookResponse.status}: ${webhookErrorText}`);
    }

    const webhookData = await webhookResponse.json();
    console.log("Webhook response:", webhookData);

    return new Response(JSON.stringify({
      success: true,
      message: "Mystery generation initiated",
      estimatedProcessingTime: "3-5 minutes",
      conversationId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error in mystery-webhook-trigger:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
