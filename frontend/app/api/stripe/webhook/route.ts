/**
 * Stripe webhook handler for payment events
 * Handles subscription creation, updates, and cancellations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '../../../../lib/stripe/config';
import { getSupabaseClient } from '../../../../lib/supabase-auth';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Stripe webhook received', {
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent'),
      url: request.url,
      method: request.method,
    });
    
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.log('❌ No stripe signature found');
      return NextResponse.json({ error: 'No stripe signature' }, { status: 400 });
    }

    const stripe = getStripeServer();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not set');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('✅ Webhook event verified:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('🔔 Event checkout.session.completed', {
          id: session.id,
          customer_email: (session.customer_details as any)?.email,
          subscription: session.subscription,
          metadata: session.metadata,
        });
        await handleCheckoutCompleted(session);
        break;
      }
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: update plan columns supporting either plan_type or tier
 */
async function updateUserPlan(userId: string, fields: Record<string, any>) {
  const client = getSupabaseClient();

  // First try with plan_type
  const primaryUpdate: Record<string, any> = { ...fields };
  if (fields.plan_type && !('tier' in fields)) {
    primaryUpdate.plan_type = fields.plan_type;
  }

  let { error } = await (client as any)
    .from('plans')
    .update(primaryUpdate)
    .eq('user_id', userId);

  // If column doesn't exist, retry using tier
  if (error && (error.code === '42703' || /column .* does not exist/i.test(error.message || ''))) {
    const fallbackUpdate: Record<string, any> = { ...fields };
    if (fields.plan_type) {
      delete fallbackUpdate.plan_type;
      fallbackUpdate.tier = fields.plan_type;
    }
    const res2 = await (client as any)
      .from('plans')
      .update(fallbackUpdate)
      .eq('user_id', userId);
    error = res2.error;
  }

  if (error) {
    console.error('❌ Failed to update user plan:', error);
    throw error;
  }
}

function toIsoOrNull(epochSeconds: any): string | null {
  const n = typeof epochSeconds === 'number' ? epochSeconds : Number(epochSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    return new Date(n * 1000).toISOString();
  } catch (_e) {
    return null;
  }
}

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🔍 Handling checkout completed:', session.id);
  
  const userId = session.metadata?.user_id;
  const planType = session.metadata?.plan_type;
  
  if (!userId || !planType) {
    console.error('❌ Missing metadata in checkout session');
    return;
  }
  
  console.log('✅ Upgrading user to Pro:', userId);
  
  // Update user plan in database (supports plan_type or tier)
  await updateUserPlan(userId, {
    plan_type: planType,
    stripe_subscription_id: session.subscription as string,
    status: 'active',
    updated_at: new Date().toISOString(),
  });
  
  console.log('✅ User plan updated successfully');
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('🔍 Handling subscription created:', subscription.id);
  
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    console.error('❌ Missing user_id in subscription metadata');
    return;
  }
  
  // Update plan with subscription details
  const startIso = toIsoOrNull((subscription as any).current_period_start);
  const endIso = toIsoOrNull((subscription as any).current_period_end);
  const update: Record<string, any> = {
    status: subscription.status,
    stripe_subscription_id: subscription.id,
    updated_at: new Date().toISOString(),
  };
  if (startIso) update.current_period_start = startIso;
  if (endIso) update.current_period_end = endIso;
  await updateUserPlan(userId, update);
  
  console.log('✅ Subscription details updated');
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔍 Handling subscription updated:', subscription.id);
  
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    console.error('❌ Missing user_id in subscription metadata');
    return;
  }
  
  // Update plan status
  const startIso2 = toIsoOrNull((subscription as any).current_period_start);
  const endIso2 = toIsoOrNull((subscription as any).current_period_end);
  const update2: Record<string, any> = {
    status: subscription.status,
    updated_at: new Date().toISOString(),
  };
  if (startIso2) update2.current_period_start = startIso2;
  if (endIso2) update2.current_period_end = endIso2;
  await updateUserPlan(userId, update2);
  
  console.log('✅ Subscription updated');
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('🔍 Handling subscription deleted:', subscription.id);
  
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    console.error('❌ Missing user_id in subscription metadata');
    return;
  }
  
  // Downgrade user to free plan
  await updateUserPlan(userId, {
    plan_type: 'free',
    status: 'cancelled',
    stripe_subscription_id: null,
    updated_at: new Date().toISOString(),
  });
  
  console.log('✅ User downgraded to free plan');
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('🔍 Handling payment succeeded:', invoice.id);
  
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) {
    console.log('ℹ️ No subscription associated with invoice');
    return;
  }
  
  // Update plan status to active
  const client = getSupabaseClient();
  const { data: rows, error: selErr } = await (client as any)
    .from('plans')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .limit(1)
    .maybeSingle?.() ?? await (client as any)
      .from('plans')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

  if (selErr || !rows) {
    console.error('❌ Could not resolve user by subscription id:', selErr);
    return;
  }

  await updateUserPlan((rows as any).user_id, {
    status: 'active',
    updated_at: new Date().toISOString(),
  });
  
  console.log('✅ Plan status updated to active');
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('🔍 Handling payment failed:', invoice.id);
  
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) {
    console.log('ℹ️ No subscription associated with invoice');
    return;
  }
  
  // Update plan status to past_due
  const client = getSupabaseClient();
  const { error } = await (client as any)
    .from('plans')
    .update({ 
      status: 'past_due',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscriptionId);
    
  if (error) {
    console.error('❌ Failed to update plan status:', error);
    throw error;
  }
  
  console.log('✅ Plan status updated to past_due');
}
