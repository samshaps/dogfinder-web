/**
 * Stripe webhook handler for payment events
 * Handles subscription creation, updates, and cancellations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe/config';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { appConfig } from '@/lib/config';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = `webhook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  try {
    console.log(`🔍 [${requestId}] Stripe webhook received`, {
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent'),
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
    
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      console.error(`❌ [${requestId}] No stripe signature found`);
      return NextResponse.json({ error: 'No stripe signature' }, { status: 400 });
    }

    const stripe = getStripeServer();
    const webhookSecret = appConfig.stripeWebhookSecret;
    
    if (!webhookSecret) {
      console.error(`❌ [${requestId}] STRIPE_WEBHOOK_SECRET not set`);
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error(`❌ [${requestId}] Webhook signature verification failed:`, err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log(`✅ [${requestId}] Webhook event verified:`, {
      type: event.type,
      id: event.id,
      created: event.created,
      livemode: event.livemode,
    });

    // Check for duplicate events (idempotency)
    const isDuplicate = await checkDuplicateEvent(event.id);
    if (isDuplicate) {
      console.log(`ℹ️ [${requestId}] Duplicate event detected, skipping:`, event.id);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Handle different event types with enhanced error handling
    let eventHandled = false;
    let eventError: Error | null = null;
    
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log(`🔔 [${requestId}] Processing checkout.session.completed`, {
            id: session.id,
            customer_email: (session.customer_details as any)?.email,
            subscription: session.subscription,
            metadata: session.metadata,
          });
          await handleCheckoutCompleted(session, requestId);
          eventHandled = true;
          break;
        }
          
        case 'customer.subscription.created':
          console.log(`🔔 [${requestId}] Processing customer.subscription.created`);
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription, requestId);
          eventHandled = true;
          break;
          
        case 'customer.subscription.updated':
          console.log(`🔔 [${requestId}] Processing customer.subscription.updated`);
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, requestId);
          eventHandled = true;
          break;
          
        case 'customer.subscription.deleted':
          console.log(`🔔 [${requestId}] Processing customer.subscription.deleted`);
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, requestId);
          eventHandled = true;
          break;
          
        case 'invoice.payment_succeeded':
          console.log(`🔔 [${requestId}] Processing invoice.payment_succeeded`);
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice, requestId);
          eventHandled = true;
          break;
          
        case 'invoice.payment_failed':
          console.log(`🔔 [${requestId}] Processing invoice.payment_failed`);
          await handlePaymentFailed(event.data.object as Stripe.Invoice, requestId);
          eventHandled = true;
          break;
          
        default:
          console.log(`ℹ️ [${requestId}] Unhandled event type:`, event.type);
      }
    } catch (error) {
      eventError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`❌ [${requestId}] Event processing failed:`, {
        eventType: event.type,
        eventId: event.id,
        error: eventError.message,
        stack: eventError.stack,
      });
    }

    // Record event processing result
    await recordWebhookEvent(event.id, event.type, eventHandled, eventError, requestId);

    if (eventError) {
      return NextResponse.json(
        { 
          error: 'Event processing failed',
          details: eventError.message,
          requestId 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      received: true, 
      processed: eventHandled,
      requestId 
    });

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
 * Check for duplicate webhook events to ensure idempotency
 */
async function checkDuplicateEvent(eventId: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = await (client as any)
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', eventId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error checking for duplicate event:', error);
      return false; // If we can't check, assume not duplicate
    }

    return !!data; // Return true if event exists (duplicate)
  } catch (error) {
    console.error('❌ Error checking duplicate event:', error);
    return false; // If we can't check, assume not duplicate
  }
}

/**
 * Record webhook event processing result for audit and debugging
 */
async function recordWebhookEvent(
  eventId: string, 
  eventType: string, 
  handled: boolean, 
  error: Error | null, 
  requestId: string
): Promise<void> {
  try {
    const client = getSupabaseClient();
    
    await (client as any)
      .from('webhook_events')
      .insert({
        stripe_event_id: eventId,
        event_type: eventType,
        handled,
        error_message: error?.message || null,
        error_stack: error?.stack || null,
        request_id: requestId,
        processed_at: new Date().toISOString(),
      });

    console.log(`📝 [${requestId}] Webhook event recorded:`, {
      eventId,
      eventType,
      handled,
      hasError: !!error,
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to record webhook event:`, error);
    // Don't throw - this is just for audit purposes
  }
}

/**
 * Helper: update plan columns
 */
async function updateUserPlan(userId: string, fields: Record<string, any>) {
  const client = getSupabaseClient();

  const updatePayload: Record<string, any> = { ...fields };
  // Ensure we always write plan_type when present
  if (fields.plan_type) updatePayload.plan_type = fields.plan_type;

  const { error } = await (client as any)
    .from('plans')
    .update(updatePayload)
    .eq('user_id', userId);

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
async function handleCheckoutCompleted(session: Stripe.Checkout.Session, requestId: string) {
  console.log(`🔍 [${requestId}] Handling checkout completed:`, session.id);
  
  const userId = session.metadata?.user_id;
  const planType = session.metadata?.plan_type;
  
  if (!userId || !planType) {
    console.error(`❌ [${requestId}] Missing metadata in checkout session:`, {
      userId: !!userId,
      planType: !!planType,
      metadata: session.metadata,
    });
    throw new Error('Missing required metadata in checkout session');
  }
  
  console.log(`✅ [${requestId}] Upgrading user to Pro:`, userId);
  
  try {
    // Update user plan in database
    await updateUserPlan(userId, {
      plan_type: planType,
      stripe_subscription_id: session.subscription as string,
      status: 'active',
      updated_at: new Date().toISOString(),
    });
    
    console.log(`✅ [${requestId}] User plan updated successfully`);
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to update user plan:`, error);
    throw error;
  }
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription, requestId: string) {
  console.log(`🔍 [${requestId}] Handling subscription created:`, subscription.id);
  
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    console.error(`❌ [${requestId}] Missing user_id in subscription metadata:`, {
      subscriptionId: subscription.id,
      metadata: subscription.metadata,
    });
    throw new Error('Missing user_id in subscription metadata');
  }
  
  try {
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
    
    console.log(`✅ [${requestId}] Subscription details updated`);
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to update subscription details:`, error);
    throw error;
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription, requestId: string) {
  console.log(`🔍 [${requestId}] Handling subscription updated:`, subscription.id);
  
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    console.error(`❌ [${requestId}] Missing user_id in subscription metadata:`, {
      subscriptionId: subscription.id,
      metadata: subscription.metadata,
    });
    throw new Error('Missing user_id in subscription metadata');
  }
  
  try {
    // Update plan status
    const startIso = toIsoOrNull((subscription as any).current_period_start);
    const endIso = toIsoOrNull((subscription as any).current_period_end);
    const update: Record<string, any> = {
      status: subscription.status,
      updated_at: new Date().toISOString(),
    };
    if (startIso) update.current_period_start = startIso;
    if (endIso) update.current_period_end = endIso;
    
    await updateUserPlan(userId, update);
    
    console.log(`✅ [${requestId}] Subscription updated`);
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to update subscription:`, error);
    throw error;
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription, requestId: string) {
  console.log(`🔍 [${requestId}] Handling subscription deleted:`, subscription.id);
  
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    console.error(`❌ [${requestId}] Missing user_id in subscription metadata:`, {
      subscriptionId: subscription.id,
      metadata: subscription.metadata,
    });
    throw new Error('Missing user_id in subscription metadata');
  }
  
  try {
    // Downgrade user to free plan
    await updateUserPlan(userId, {
      plan_type: 'free',
      status: 'cancelled',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    });
    
    console.log(`✅ [${requestId}] User downgraded to free plan`);
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to downgrade user:`, error);
    throw error;
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice, requestId: string) {
  console.log(`🔍 [${requestId}] Handling payment succeeded:`, invoice.id);
  
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) {
    console.log(`ℹ️ [${requestId}] No subscription associated with invoice`);
    return;
  }
  
  try {
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
      console.error(`❌ [${requestId}] Could not resolve user by subscription id:`, selErr);
      throw new Error(`Could not resolve user by subscription id: ${selErr?.message || 'No data'}`);
    }

    await updateUserPlan((rows as any).user_id, {
      status: 'active',
      updated_at: new Date().toISOString(),
    });
    
    console.log(`✅ [${requestId}] Plan status updated to active`);
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to update plan status:`, error);
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice, requestId: string) {
  console.log(`🔍 [${requestId}] Handling payment failed:`, invoice.id);
  
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) {
    console.log(`ℹ️ [${requestId}] No subscription associated with invoice`);
    return;
  }
  
  try {
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
      console.error(`❌ [${requestId}] Failed to update plan status:`, error);
      throw error;
    }
    
    console.log(`✅ [${requestId}] Plan status updated to past_due`);
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to update plan status:`, error);
    throw error;
  }
}
