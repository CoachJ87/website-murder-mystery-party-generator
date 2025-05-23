
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
      version: '1.1.0' // Add versioning for debugging
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
          // Update user profile
          const { error: userUpdateError } = await supabaseAdmin
            .from('profiles')
            .update({ 
              has_purchased: true, 
              purchase_date: new Date().toISOString() 
            })
            .eq('id', userId);

          if (userUpdateError) {
            console.error('Error updating user profile:', userUpdateError);
          } else {
            console.log('User profile updated successfully for user ID:', userId);
          }

          // Update conversation
          const { error: conversationUpdateError } = await supabaseAdmin
            .from('conversations')
            .update({ 
              is_paid: true,
              display_status: "purchased",
              purchase_date: new Date().toISOString(),
              payment_intent_id: session.payment_intent || null,
              payment_amount: session.amount_total || null,
              payment_currency: session.currency || null
            })
            .eq('id', mysteryId);

          if (conversationUpdateError) {
            console.error('Error updating conversation:', conversationUpdateError);
          } else {
            console.log('Conversation updated successfully for mystery ID:', mysteryId);
          }

          // Add event to a webhook_events table for audit purposes
          const { error: eventLogError } = await supabaseAdmin
            .from('webhook_events')
            .insert({
              event_type: event.type,
              payment_intent_id: session.payment_intent || null,
              mystery_id: mysteryId,
              user_id: userId,
              amount: session.amount_total || null,
              currency: session.currency || null,
              event_data: JSON.stringify({
                checkout_session_id: session.id,
                payment_status: session.payment_status,
                customer: session.customer,
                metadata: session.metadata
              })
            });

          if (eventLogError) {
            console.error('Error logging webhook event:', eventLogError);
          } else {
            console.log('Webhook event logged successfully');
          }

          console.log("Database updates complete for mystery ID:", mysteryId);
          return new Response(JSON.stringify({ 
            success: true,
            mysteryId,
            userId
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
