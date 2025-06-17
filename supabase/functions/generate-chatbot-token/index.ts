
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      "https://mhfikaomkmqcndqfohbp.supabase.co",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the token from the request header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify the user's session
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("Generating token for user:", user.id, user.email);

    // Get prompt type - free or paid based on whether they've purchased
    const { data: profileData } = await supabaseAdmin
      .from("profiles")
      .select("has_purchased")
      .eq("id", user.id)
      .single();
    
    const isPaid = profileData?.has_purchased || false;
    
    // Generate JWT token for the chatbot with user metadata
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
      source: "murder-mystery-party",
      promptType: isPaid ? "paid" : "free", 
      // Add an expiration time (e.g., 1 hour)
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };

    // Encode the payload
    const encodedPayload = btoa(JSON.stringify(payload));
    
    // In a real implementation, you would sign this token with a secret
    // For now, we'll just create a simple encoded token
    const chatbotToken = encodedPayload;
    
    // Get the correct chatbot URL based on environment
    const vercelChatbotUrl = "https://my-awesome-chatbot-nine-sand.vercel.app";

    return new Response(
      JSON.stringify({
        token: chatbotToken,
        url: `${vercelChatbotUrl}?token=${chatbotToken}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Token generation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate token" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
