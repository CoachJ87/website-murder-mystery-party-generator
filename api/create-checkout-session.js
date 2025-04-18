import Stripe from 'stripe';

export const config = {
  runtime: 'edge',
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Use the latest API version
});

export default async function handler(req) {
  if (req.method === 'POST') {
    try {
      const { mysteryId } = await req.json();

      // **REPLACED WITH YOUR ACTUAL PRICE ID:**
      const price = 'price_1RAvakKgSd73ikMWLbbjRicc';
      const productName = 'Murder Mystery Game Package';

      const successUrl = `${process.env.NEXT_PUBLIC_VERCEL_URL}/mystery/${mysteryId}?purchase=success`;
      const cancelUrl = `${process.env.NEXT_PUBLIC_VERCEL_URL}/mystery/preview/${mysteryId}?purchase=cancel`;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: price,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          mysteryId: mysteryId,
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
  } else if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
}
