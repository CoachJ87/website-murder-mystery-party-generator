import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { guest_email, guest_name, character_name, character_details, access_token, mystery_title } = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const characterUrl = `https://murder-mystery.party/character/${access_token}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8B1538 0%, #6B0F28 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎭 Murder Mystery Party</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-bottom: 20px;">Hi ${guest_name},</p>

    <p style="margin-bottom: 20px;">You've been assigned a character for <strong>${mystery_title}</strong>!</p>

    <div style="background: #F7F3E9; border-left: 4px solid #8B1538; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <h2 style="color: #8B1538; margin-top: 0; font-size: 22px;">Your Character: ${character_name}</h2>
      <p style="margin-bottom: 0; color: #2A2A2A;">${character_details}</p>
    </div>

    <p style="margin-bottom: 25px;">Click the button below to view your complete character guide:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${characterUrl}" style="display: inline-block; background: #8B1538; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View My Character</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <strong>Tip:</strong> Save this email or bookmark the link so you can access your character anytime!
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Murder Mystery Party Generator</p>
  </div>
</body>
</html>
    `.trim();

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Murder Mystery Party <[email protected]>",
        to: [guest_email],
        subject: `Your Character: ${character_name} for ${mystery_title}`,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(`Failed to send email: ${resendResponse.status}`);
    }

    const data = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
