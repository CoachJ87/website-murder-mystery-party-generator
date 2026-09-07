import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ADR-0106: single source of truth for the "your mystery is ready" email.
// Called exclusively by the notify_package_ready() DB trigger, which already
// guarantees exactly one call per package (BEFORE trigger, atomic claim via
// ready_email_sent_at). This function does not need its own dedup -- if it's
// running, the trigger has already decided this is the one legitimate send.
//
// 2026-08-27: dropped the "reply for feedback" ask (was in the subject and
// a closing paragraph). Only 6 sends existed at the time so this wasn't a
// data-driven kill, it was a mechanism problem -- reply-to-email is the
// highest-friction way to ask, and it was conflating "how was signing up"
// with "how was the mystery" (a question that belongs at Day+14/21, after
// the party, where it already lives via mystery_feedback/guest_feedback).
// This email's job is just the ready notification now.

const ALLOWED_ORIGINS = [
  'https://www.mysterymaker.party',
  'https://mysterymaker.party',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { package_id } = await req.json();
    if (!package_id) {
      throw new Error("package_id is required");
    }

    const { data: pkg, error: pkgError } = await supabase
      .from("mystery_packages")
      .select("id, title, conversation_id")
      .eq("id", package_id)
      .single();
    if (pkgError || !pkg) {
      throw new Error(`Package not found: ${pkgError?.message ?? package_id}`);
    }

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("title, user_id")
      .eq("id", pkg.conversation_id)
      .single();
    if (convError || !conversation) {
      throw new Error(`Conversation not found: ${convError?.message ?? pkg.conversation_id}`);
    }

    const mysteryTitle = pkg.title || conversation.title || "Your Mystery";

    let userEmail: string | null = null;
    let userName = "there";
    if (conversation.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(conversation.user_id);
      userEmail = authUser?.user?.email ?? null;
      userName = authUser?.user?.user_metadata?.name || userEmail?.split('@')[0] || "there";
    }
    if (!userEmail) {
      throw new Error(`No email on file for conversation ${pkg.conversation_id}`);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #000000;">
        <div style="background: #C81400; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <img src="https://www.mysterymaker.party/email-assets/wordmark-cream.png" alt="Mystery Maker" width="232" height="40" style="display: block; max-width: 232px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;" />
        </div>
        <div style="background: #111111; padding: 40px 30px; border-radius: 0 0 8px 8px;">
          <h2 style="font-size: 22px; color: #F5F0E8; margin: 0 0 20px 0; font-weight: 700;">Your Mystery Has Been Generated!</h2>
          <p style="font-size: 16px; color: rgba(245,240,232,0.7); margin-bottom: 20px; line-height: 1.6;">
            Hi ${userName}, great news! Your murder mystery "${mysteryTitle}" is ready and waiting for you.
          </p>
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://www.mysterymaker.party/mystery/${pkg.conversation_id}" style="display: inline-block; background: #C81400; color: #F5F0E8; padding: 16px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              View Your Mystery
            </a>
          </div>
        </div>
        <div style="text-align: center; padding: 20px; color: rgba(245,240,232,0.35); font-size: 12px;">
          <a href="https://www.mysterymaker.party" style="color: rgba(245,240,232,0.5); text-decoration: none;">mysterymaker.party</a>
        </div>
      </body>
      </html>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mystery Maker <support@mysterymaker.party>",
        to: [userEmail],
        subject: "Your Mystery is Ready!",
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${response.status} ${errorText}`);
    }

    console.log(`Ready email sent for package ${package_id} to ${userEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: "Ready email sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending mystery-ready email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
