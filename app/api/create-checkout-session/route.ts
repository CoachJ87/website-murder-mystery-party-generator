import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  try {
    const { mysteryId, userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (!mysteryId) {
      return NextResponse.json({ error: 'Mystery ID is required.' }, { status: 400 });
    }

    // Make sure STRIPE_SECRET_KEY is set
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY environment variable is not set');
      return NextResponse.json({ error: 'Payment service configuration error.' }, { status: 500 });
    }

    // This is your Stripe Price ID
    const price = 'price_1RAvakKgSd73ikMWLbbjRicc';
    const productName = 'Murder Mystery Game Package';
    
    // Build proper URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.NEXT_PUBLIC_VERCEL_URL 
                     ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
                     : 'http://localhost:3000');
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

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}