
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configure CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Define webhook URL from environment
const webhookUrl = Deno.env.get("WEBHOOK_URL") || "";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body to get conversation ID
    const { conversationId, testMode = false } = await req.json();

    if (!conversationId) {
      throw new Error("Conversation ID is required");
    }

    console.log(`Processing webhook for conversation: ${conversationId}, testMode: ${testMode}`);

    // Retrieve conversation data with user_id and messages
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*, messages(*), user_id")
      .eq("id", conversationId)
      .single();

    if (conversationError) {
      console.error("Error fetching conversation:", conversationError);
      throw new Error(`Failed to fetch conversation: ${conversationError.message}`);
    }

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    console.log(`Found conversation with ${conversation.messages?.length || 0} messages`);

    // Extract user_id from the conversation
    const userId = conversation.user_id;
    
    if (!userId) {
      console.warn("Warning: No user_id found for conversation");
    }

    // Format all messages into a concatenated string for easier parsing
    const messageContents = conversation.messages
      ? conversation.messages.map((msg: any) => {
          const role = msg.role === "assistant" ? "AI" : "User";
          return `${role}: ${msg.content}`;
        }).join("\n\n---\n\n")
      : "";

    // Structure the payload with clear fields
    const webhookPayload = {
      userId,
      conversationId,
      conversationTitle: conversation.title || "Untitled Mystery",
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      // Send the full concatenated message string for easier parsing
      conversationContent: messageContents,
      // Also include raw messages for more detailed processing if needed
      rawMessages: conversation.messages,
      testMode
    };

    console.log(`Sending payload to webhook: ${webhookUrl}`);
    console.log(`Payload size: ${JSON.stringify(webhookPayload).length} characters`);

    if (webhookUrl) {
      // Send data to webhook
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error(`Webhook returned error: ${webhookResponse.status}`, errorText);
        throw new Error(`Webhook request failed with status ${webhookResponse.status}: ${errorText}`);
      }

      const responseData = await webhookResponse.json();
      console.log("Webhook response:", responseData);

      // Update conversation to mark it as processed
      const { error: updateError } = await supabase
        .from("conversations")
        .update({
          webhook_sent: true,
          webhook_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (updateError) {
        console.error("Error updating conversation:", updateError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Webhook successfully triggered",
          webhookResponse: responseData
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          } 
        }
      );
    } else {
      console.warn("No webhook URL configured. Skipping webhook call.");
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No webhook URL configured"
        }),
        { 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json" 
          },
          status: 400
        }
      );
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
