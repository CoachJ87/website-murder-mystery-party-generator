import Stripe from 'stripe';

export const config = {
  runtime: 'edge',
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(req) {
  if (req.method === 'POST') {
    let event;
    const signature = req.headers.get('stripe-signature');
    const body = await req.text(); // Use req.text() to get the raw body as a string

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
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
      const userId = session.metadata?.userId; // Extract userId as well

      if (mysteryId && userId) {
        console.log(`Checkout session completed for mystery ID: ${mysteryId} and user ID: ${userId}`);

        // **TODO: Update your Supabase database here**
        // 1. Use supabaseAdmin to interact with your database
        const { error: userUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({ has_purchased: true, purchase_date: new Date().toISOString() })
          .eq('id', userId);

        if (userUpdateError) {
          console.error('Error updating user profile:', userUpdateError);
          return new Response('Failed to update user profile', { status: 500 });
        }

        // Update conversations table if applicable
        const { error: conversationUpdateError } = await supabaseAdmin
          .from('conversations')
          .update({ is_paid: true, purchase_date: new Date().toISOString() })
          .eq('mystery_id', mysteryId)
          .eq('user_id', userId); // Assuming you link conversation to user

        if (conversationUpdateError) {
          console.error('Error updating conversation:', conversationUpdateError);
          // Decide if this is critical enough to fail the webhook response
        }

        return new Response(null, { status: 200 });
      } else {
        console.log('Missing mystery ID or user ID in checkout session metadata.');
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
