// api/webhook.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Create a Supabase client with the admin key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req) {
  if (req.method === 'POST') {
    let event;
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    
    console.log("Webhook received: ", signature ? "Valid signature" : "No signature");

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

      // Extract mysteryId from metadata
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
              purchase_date: new Date().toISOString() 
            })
            .eq('id', mysteryId);

          if (conversationUpdateError) {
            console.error('Error updating conversation:', conversationUpdateError);
          } else {
            console.log('Conversation updated successfully for mystery ID:', mysteryId);
          }

          console.log("Database updates complete for mystery ID:", mysteryId);
          return new Response(null, { status: 200 });
        } catch (error) {
          console.error('Error processing webhook:', error);
          return new Response('Error processing webhook', { status: 500 });
        }
      } else {
        console.log('Missing mystery ID or user ID in checkout session metadata.');
        console.log('Session metadata:', session.metadata);
        return new Response('Missing metadata', { status: 200 });
      }
    } else {
      // Handle other event types if needed
      console.log(`Received event type: ${event.type}`);
      return new Response(null, { status: 200 });
    }
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
