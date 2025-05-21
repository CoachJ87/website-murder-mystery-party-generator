
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
    const { conversationId } = await req.json();
    console.log(`Processing webhook trigger for conversation: ${conversationId}`);

    if (!conversationId) {
      return new Response(JSON.stringify({ error: "Conversation ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the conversation with all messages
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*, messages(*), system_instruction")
      .eq("id", conversationId)
      .single();

    if (conversationError) {
      console.error("Error fetching conversation:", conversationError);
      return new Response(JSON.stringify({ error: "Failed to fetch conversation data" }), {
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
        conversation,
        timestamp: new Date().toISOString(),
      })
    });

    if (!webhookResponse.ok) {
      const webhookErrorText = await webhookResponse.text();
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
