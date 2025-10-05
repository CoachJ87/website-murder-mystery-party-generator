// api/create-checkout-session.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req) {
  if (req.method === 'POST') {
    try {
      const { mysteryId, userId } = await req.json();

      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!mysteryId) {
        return new Response(JSON.stringify({ error: 'Mystery ID is required.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Make sure STRIPE_SECRET_KEY is set
      if (!process.env.STRIPE_SECRET_KEY) {
        console.error('STRIPE_SECRET_KEY environment variable is not set');
        return new Response(JSON.stringify({ error: 'Payment service configuration error.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // This is your Stripe Price ID
      const price = 'price_1SD68WKgSd73ikMWtUjQBZZg';
      const productName = 'Murder Mystery Game Package';
      
      // Build proper URLs
      const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : 'http://localhost:3000';
      const successUrl = `${baseUrl}/mystery/${mysteryId}?purchase=success`;
      const cancelUrl = `${baseUrl}/mystery/preview/${mysteryId}?purchase=cancel`;

      // Create checkout session
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
          userId: userId,
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
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
