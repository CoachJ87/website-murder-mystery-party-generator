import Stripe from 'stripe';
import { buffer } from 'node:stream/consumers';

export const config = {
  runtime: 'edge',
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req) {
  if (req.method === 'POST') {
    const buf = await buffer(req.body);
    const sig = req.headers.get('stripe-signature');

    let event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
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

      if (mysteryId) {
        console.log(`Checkout session completed for mystery ID: ${mysteryId}`);

        // **TODO: Update your Supabase database here**
        // 1. Identify the user associated with this purchase (using session.customer?)
        // 2. Update the 'profiles' table to set has_purchased to true for that user.
        // 3. Update the 'conversations' table (if applicable) to set is_paid and purchase_date.

        return new Response(null, { status: 200 });
      } else {
        console.log('No mystery ID found in checkout session metadata.');
        return new Response('No mystery ID found', { status: 200 });
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
