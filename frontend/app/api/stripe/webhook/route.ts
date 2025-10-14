/**
 * Stripe webhook handler for payment events
 * Handles subscription creation, updates, and cancellations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe/config';
import { getSupabaseClient } from '@/lib/supabase-auth';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Stripe webhook received');
    
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.log('❌ No stripe signature found');
      return NextResponse.json(
        { error: 'No stripe signature' },
        { status: 400 }
      );
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
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
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
  
  // Update user plan in database
  const client = getSupabaseClient();
  const { error } = await (client as any)
    .from('plans')
    .update({ 
      plan_type: planType,
      stripe_subscription_id: session.subscription as string,
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
    
  if (error) {
    console.error('❌ Failed to update user plan:', error);
    throw error;
  }
  
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
  const client = getSupabaseClient();
  const { error } = await (client as any)
    .from('plans')
    .update({ 
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
    
  if (error) {
    console.error('❌ Failed to update subscription details:', error);
    throw error;
  }
  
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
  const client = getSupabaseClient();
  const { error } = await (client as any)
    .from('plans')
    .update({ 
      status: subscription.status,
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
    
  if (error) {
    console.error('❌ Failed to update subscription:', error);
    throw error;
  }
  
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
  const client = getSupabaseClient();
  const { error } = await (client as any)
    .from('plans')
    .update({ 
      plan_type: 'free',
      status: 'cancelled',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);
    
  if (error) {
    console.error('❌ Failed to downgrade user:', error);
    throw error;
  }
  
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
  const { error } = await (client as any)
    .from('plans')
    .update({ 
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscriptionId);
    
  if (error) {
    console.error('❌ Failed to update plan status:', error);
    throw error;
  }
  
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
