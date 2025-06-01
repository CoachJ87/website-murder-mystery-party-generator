// api/webhook.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Create a Supabase client with the admin key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req) {
  // Simple response for GET requests to verify the endpoint exists
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'Webhook endpoint is active',
      version: '2.0.0' // Updated version
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (req.method === 'POST') {
    let event;
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    
    console.log("Webhook received: ", signature ? "Valid signature" : "No signature");
    
    // Choose the appropriate webhook secret based on the mode
    const isTestMode = process.env.NODE_ENV !== 'production' || 
                      req.headers.get('stripe-mode') === 'test';
    
    const webhookSecret = isTestMode 
      ? process.env.STRIPE_TEST_WEBHOOK_SECRET 
      : process.env.STRIPE_WEBHOOK_SECRET;
    
    console.log("Using webhook secret for mode:", isTestMode ? "TEST" : "PRODUCTION");

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log("Webhook event constructed: ", event.type);
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, {
        status: 400,
      });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Extract mysteryId and userId from metadata
      const mysteryId = session.metadata?.mysteryId;
      const userId = session.metadata?.userId;

      if (mysteryId && userId) {
        console.log(`Checkout session completed for mystery ID: ${mysteryId} and user ID: ${userId}`);

        try {
          // FETCH COMPREHENSIVE MYSTERY DATA
          console.log("Fetching comprehensive mystery data...");
          const { data: conversationData, error: convError } = await supabaseAdmin
            .from('conversations')
            .select(`
              *,
              messages(*)
            `)
            .eq('id', mysteryId)
            .single();

          if (convError) {
            console.error('Error fetching conversation:', convError);
          }

          // Extract mystery elements from the latest AI message if available
          let extractedMysteryElements = null;
          if (conversationData?.messages) {
            const aiMessages = conversationData.messages
              .filter(m => m.is_ai || m.role === 'assistant')
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            if (aiMessages.length > 0) {
              const latestAiMessage = aiMessages[0];
              
              // Basic parsing of the AI response
              const content = latestAiMessage.content || '';
              
              // Extract title
              const titleMatch = content.match(/#\s*["']?([^"'\n#]+)["']?(?:\s*-\s*A\s+MURDER\s+MYSTERY)?/i);
              const extractedTitle = titleMatch ? titleMatch[1].trim() : null;
              
              // Extract premise
              const premiseMatch = content.match(/##?\s*PREMISE\s*\n([\s\S]*?)(?=##|$)/i);
              const premise = premiseMatch ? premiseMatch[1].trim() : null;
              
              // Extract victim
              const victimMatch = content.match(/##?\s*VICTIM\s*\n\*\*([^*]+)\*\*\s*-\s*([^\n]+)/i);
              const victim = victimMatch ? {
                name: victimMatch[1].trim(),
                description: victimMatch[2].trim()
              } : null;
              
              // Extract characters
              const characterListMatch = content.match(/##?\s*CHARACTER LIST[^\n]*\n([\s\S]*?)(?=##|$)/i);
              let characters = [];
              if (characterListMatch) {
                const characterText = characterListMatch[1];
                const characterMatches = characterText.matchAll(/\d+\.\s*\*\*([^*]+)\*\*\s*-\s*([^\n]+)/g);
                characters = Array.from(characterMatches).map(match => ({
                  name: match[1].trim(),
                  description: match[2].trim()
                }));
              }
              
              // Extract murder method
              const murderMethodMatch = content.match(/##?\s*MURDER METHOD\s*\n([\s\S]*?)(?=##|$)/i);
              const murderMethod = murderMethodMatch ? murderMethodMatch[1].trim() : null;
              
              extractedMysteryElements = {
                title: extractedTitle,
                premise,
                victim,
                characters,
                murder_method: murderMethod
              };
            }
          }

          // BUILD COMPREHENSIVE WEBHOOK PAYLOAD
          const comprehensivePayload = {
            event_type: "mystery_purchase_completed",
            timestamp: new Date().toISOString(),
            stripe_data: {
              checkout_session_id: session.id,
              payment_intent: session.payment_intent,
              amount_total: session.amount_total,
              currency: session.currency,
              payment_status: session.payment_status
            },
            mystery_metadata: {
              conversation_id: mysteryId,
              user_id: userId
            },
            form_data: conversationData ? {
              theme: conversationData.theme,
              player_count: conversationData.player_count,
              script_type: conversationData.script_type,
              has_accomplice: conversationData.has_accomplice,
              additional_details: conversationData.additional_details,
              title: conversationData.title,
              system_instruction: conversationData.system_instruction
            } : null,
            conversation_content: conversationData?.messages ? {
              messages: conversationData.messages.map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.created_at,
                is_ai: msg.is_ai
              })),
              full_conversation_text: conversationData.messages
                .map(msg => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${msg.content}`)
                .join('\n\n---\n\n')
            } : null,
            extracted_mystery_elements: extractedMysteryElements,
            database_context: conversationData ? {
              created_at: conversationData.created_at,
              updated_at: conversationData.updated_at,
              needs_package_generation: true,
              has_complete_package: false
            } : null,
            generation_requirements: {
              sections_needed: [
                "host_guide",
                "character_guides", 
                "evidence_cards",
                "detective_script",
                "relationship_matrix",
                "solution_reveal"
              ],
              output_formats: ["structured_json"],
              player_count: conversationData?.player_count || 4
            },
            webhook_version: "v2.0"
          };

          // SEND TO YOUR MAKE.COM WEBHOOK
          try {
            const makeWebhookUrl = "https://hook.eu2.make.com/uannnuc9hc79vorh1iyxwb9t5lp484n3";
            
            console.log("Sending comprehensive payload to Make.com...");
            console.log("Payload preview:", {
              event_type: comprehensivePayload.event_type,
              conversation_id: comprehensivePayload.mystery_metadata.conversation_id,
              theme: comprehensivePayload.form_data?.theme,
              player_count: comprehensivePayload.form_data?.player_count,
              messages_count: comprehensivePayload.conversation_content?.messages?.length || 0,
              extracted_title: comprehensivePayload.extracted_mystery_elements?.title
            });
            
            const webhookResponse = await fetch(makeWebhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(comprehensivePayload)
            });

            if (!webhookResponse.ok) {
              const errorText = await webhookResponse.text();
              console.error('Make.com webhook failed:', webhookResponse.status, errorText);
            } else {
              console.log('Successfully sent comprehensive data to Make.com');
            }
          } catch (webhookError) {
            console.error('Error sending to Make.com:', webhookError);
          }

          // UPDATE USER PROFILE
          const { error: userUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({ 
              has_purchased: true, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', userId);

          if (userUpdateError) {
            console.error('Error updating user profile:', userUpdateError);
          } else {
            console.log('User profile updated successfully for user ID:', userId);
          }

          // UPDATE CONVERSATION (using only fields that exist in your schema)
          const { error: conversationUpdateError } = await supabaseAdmin
            .from('conversations')
            .update({ 
              is_paid: true,
              display_status: "purchased",
              purchase_date: new Date().toISOString(),
              needs_package_generation: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', mysteryId);

          if (conversationUpdateError) {
            console.error('Error updating conversation:', conversationUpdateError);
          } else {
            console.log('Conversation updated successfully for mystery ID:', mysteryId);
          }

          // TRY TO LOG WEBHOOK EVENT (optional - won't fail if table doesn't exist)
          try {
            const { error: eventLogError } = await supabaseAdmin
              .from('webhook_events')
              .insert({
                event_type: event.type,
                mystery_id: mysteryId,
                user_id: userId,
                amount: session.amount_total || null,
                currency: session.currency || null,
                event_data: JSON.stringify({
                  checkout_session_id: session.id,
                  payment_status: session.payment_status,
                  customer: session.customer,
                  metadata: session.metadata,
                  comprehensive_payload_sent: true
                })
              });

            if (eventLogError && eventLogError.code !== '42P01') { // 42P01 = table doesn't exist
              console.error('Error logging webhook event:', eventLogError);
            } else if (!eventLogError) {
              console.log('Webhook event logged successfully');
            }
          } catch (logError) {
            console.log('Webhook events table may not exist, skipping log');
          }

          console.log("Database updates complete for mystery ID:", mysteryId);
          return new Response(JSON.stringify({ 
            success: true,
            mysteryId,
            userId,
            comprehensive_data_sent: true,
            extracted_title: extractedMysteryElements?.title || null
          }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Error processing webhook:', error);
          return new Response(JSON.stringify({ 
            error: 'Error processing webhook',
            details: error.message 
          }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } else {
        console.log('Missing mystery ID or user ID in checkout session metadata.');
        console.log('Session metadata:', session.metadata);
        return new Response(JSON.stringify({
          warning: 'Missing metadata',
          received: session.metadata
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Handle other event types if needed
      console.log(`Received event type: ${event.type}`);
      return new Response(JSON.stringify({ 
        received: true,
        eventType: event.type
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
