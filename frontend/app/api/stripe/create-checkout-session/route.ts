/**
 * API route to create Stripe Checkout sessions for Pro plan upgrades
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// Use tsconfig baseUrl (.) so we can import from 'lib/*'
import { getStripeServer, PLANS } from '@/lib/stripe/config';
import { getSupabaseClient } from '@/lib/supabase-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Creating Stripe checkout session...');
    
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      console.log('❌ No authenticated user');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user from database
    const client = getSupabaseClient();
    const { data: userData, error: userError } = await (client as any)
      .from('users')
      .select('id, email, name')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      console.error('❌ User not found:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = (userData as any).id;
    console.log('✅ User found:', userId);

    // Check current plan and subscription status
    const { data: planData } = await (client as any)
      .from('plans')
      .select('plan_type, stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    const currentPlan = planData?.plan_type || 'free';
    const subscriptionId = planData?.stripe_subscription_id;
    
    // If user has a Pro plan with an active subscription, check if it's scheduled for cancellation
    if (currentPlan === 'pro' && subscriptionId) {
      try {
        const stripe = getStripeServer();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Only block if they have an active subscription that's NOT scheduled for cancellation
        // If it's scheduled for cancellation (cancel_at_period_end = true), allow resubscription
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          if (!subscription.cancel_at_period_end) {
            console.log('❌ User already has active Pro plan that is not scheduled for cancellation');
            return NextResponse.json(
              { error: 'You already have an active Pro plan. If you want to manage your subscription, please use the profile page.' },
              { status: 400 }
            );
          } else {
            console.log('✅ User has Pro plan scheduled for cancellation, allowing resubscription');
          }
        }
      } catch (stripeError: any) {
        // If subscription doesn't exist in Stripe but exists in our DB, allow resubscription
        if (stripeError.code === 'resource_missing') {
          console.log('⚠️ Subscription not found in Stripe but exists in DB, allowing resubscription');
        } else {
          console.error('Error checking subscription:', stripeError);
          // On error, continue with checkout creation
        }
      }
    }

    // Create Stripe checkout session
    const stripe = getStripeServer();
    const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!proPriceId) {
      console.error('❌ Missing STRIPE_PRO_PRICE_ID');
      return NextResponse.json({ error: 'Server not configured for payments' }, { status: 500 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      line_items: [
        { price: proPriceId, quantity: 1 },
      ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/profile?upgrade=success`,
      cancel_url: `${request.nextUrl.origin}/pricing?upgrade=cancelled`,
      customer_email: session.user.email,
      client_reference_id: userId, // Backup way to pass user ID
      metadata: {
        user_id: userId,
        plan_type: 'pro',
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_type: 'pro',
        },
      },
    });

    console.log('✅ Checkout session created:', checkoutSession.id);

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });

  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
