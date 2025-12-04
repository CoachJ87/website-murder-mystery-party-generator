
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configure CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
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
      .select("*, messages(*), user_id, title, theme, player_count, script_type, mystery_style, has_accomplice")
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

    // Fetch user email and name from auth
    let userEmail = null;
    let userName = null;

    if (userId) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      
      if (authUser && authUser.user) {
        userEmail = authUser.user.email;
        userName = authUser.user.user_metadata?.name || authUser.user.email?.split('@')[0] || 'User';
      }
    }

    // Format all messages into a concatenated string for easier parsing
    const conversationContent = conversation.messages
      ? conversation.messages.map((msg: any) => {
          const role = msg.role === "assistant" ? "AI" : "User";
          return `${role}: ${msg.content}`;
        }).join("\n\n---\n\n")
      : "";

    // Simplified payload with only essential data
    // Build individual message fields for Make.com
    const messageFields: any = {};
    conversation.messages.forEach((msg: any, index: number) => {
      const msgNum = index + 1;
      messageFields[`message_${msgNum}_role`] = msg.role;
      messageFields[`message_${msgNum}_content`] = msg.content;
    });

    const webhookPayload = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: conversation.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      message_count: conversation.messages.length,
      ...messageFields,
      userId,
      userEmail,
      userName,
      conversationId,
      callback_domain: testMode ? "http://localhost:5173" : "https://www.mysterymaker.party",
      callback_url: testMode ? "http://localhost:5173/api/generation-complete" : "https://www.mysterymaker.party/api/generation-complete",
      environment: testMode ? "development" : "production",
      title: conversation.title || `Mystery - ${conversation.player_count} Players`,
      playerCount: conversation.player_count || null,
      theme: conversation.theme || null,
      scriptType: conversation.script_type || 'full',
      hasAccomplice: conversation.has_accomplice || false,
      mysteryStyle: conversation.mystery_style || 'character',
      testMode,
      conversationContent
    };

    console.log(`Sending simplified payload to webhook: ${webhookUrl}`);
    console.log(`Payload size: ${JSON.stringify(webhookPayload).length} characters`);

    // Check if webhook URL is configured
    if (!webhookUrl) {
      console.warn("No webhook URL configured in the environment. Cannot send webhook.");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No webhook URL configured in the environment"
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

    // Send data to webhook with detailed logging
    console.log("About to send request to webhook URL");
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    });

    // Log webhook response status
    console.log(`Webhook response status: ${webhookResponse.status}`);

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`Webhook returned error: ${webhookResponse.status}`, errorText);
      throw new Error(`Webhook request failed with status ${webhookResponse.status}: ${errorText}`);
    }

    // Parse webhook response data
    let responseData;
    const contentType = webhookResponse.headers.get('content-type');
    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = await webhookResponse.json();
        console.log("Webhook response data:", responseData);
      } else {
        const textResponse = await webhookResponse.text();
        console.log("Webhook text response:", textResponse);
        responseData = { rawResponse: textResponse };
      }
    } catch (error) {
      console.warn("Error parsing webhook response:", error);
      responseData = { error: "Could not parse response" };
    }

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
    } else {
      console.log("Successfully marked conversation as processed");
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
