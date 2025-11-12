/**
 * Stripe webhook handler for payment events
 * Handles subscription creation, updates, and cancellations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe/config';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { appConfig } from '@/lib/config';
import { setPlan } from '@/lib/stripe/plan-sync';
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
      console.error(`❌ [${requestId}] Stripe webhook secret not set (expected STRIPE_WEBHOOK_SECRET_${appConfig.stripeMode.toUpperCase()} or STRIPE_WEBHOOK_SECRET)`);
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
            client_reference_id: (session as any).client_reference_id,
            payment_status: session.payment_status,
            mode: session.mode,
          });
          await handleCheckoutCompleted(session, requestId, event.id);
          eventHandled = true;
          break;
        }
          
        case 'customer.subscription.created':
          console.log(`🔔 [${requestId}] Processing customer.subscription.created`);
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription, requestId, event.id);
          eventHandled = true;
          break;
          
      case 'customer.subscription.updated':
        console.log(`🔔 [${requestId}] Processing customer.subscription.updated`);
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, requestId, event.id);
        eventHandled = true;
        break;
        
      case 'customer.subscription.trial_will_end':
        console.log(`🔔 [${requestId}] Processing customer.subscription.trial_will_end`);
        await handleTrialWillEnd(event.data.object as Stripe.Subscription, requestId);
        eventHandled = true;
        break;
          
        case 'customer.subscription.deleted':
          console.log(`🔔 [${requestId}] Processing customer.subscription.deleted`);
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, requestId, event.id);
          eventHandled = true;
          break;
          
        case 'invoice.payment_succeeded':
          console.log(`🔔 [${requestId}] Processing invoice.payment_succeeded`);
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice, requestId, event.id);
          eventHandled = true;
          break;
          
        case 'invoice.payment_failed':
          console.log(`🔔 [${requestId}] Processing invoice.payment_failed`);
          await handlePaymentFailed(event.data.object as Stripe.Invoice, requestId, event.id);
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
 * Helper: update plan columns (DEPRECATED - use setPlan instead)
 * @deprecated Use setPlan() from '@/lib/stripe/plan-sync' instead
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
 * Map Stripe subscription status to our plan status
 */
function mapStripeStatusToPlanStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    case 'trialing':
      return 'trialing';
    case 'unpaid':
      return 'unpaid';
    default:
      console.warn(`Unknown Stripe status: ${stripeStatus}`);
      return 'unknown';
  }
}

/**
 * Enable email alerts for a user (called automatically when upgrading to Pro)
 */
async function enableEmailAlertsForUser(
  userId: string,
  requestId: string,
  options: { force?: boolean } = {}
): Promise<void> {
  try {
    const client = getSupabaseClient();

    const { data: existing, error: fetchError } = await (client as any)
      .from('alert_settings')
      .select('enabled, cadence')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error(`⚠️ [${requestId}] Failed to read alert settings for user ${userId}:`, fetchError);
      return;
    }

    const force = options.force ?? false;

    if (existing && existing.enabled === false && !force) {
      console.log(`ℹ️ [${requestId}] Skipping auto-enable of email alerts for user ${userId} (user opted out).`);
      return;
    }

    const cadence = existing?.cadence || 'daily';

    // Upsert alert settings with enabled: true
    const { error } = await (client as any)
      .from('alert_settings')
      .upsert({
        user_id: userId,
        enabled: true,
        cadence,
        last_sent_at_utc: null,
        last_seen_ids: [],
        paused_until: null,
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error(`⚠️ [${requestId}] Failed to enable email alerts for user ${userId}:`, error);
      // Don't throw - this is not critical for webhook processing
    } else {
      console.log(`✅ [${requestId}] Email alerts enabled for user ${userId}`);
    }
  } catch (error) {
    console.error(`⚠️ [${requestId}] Error enabling email alerts for user ${userId}:`, error);
    // Don't throw - this is not critical for webhook processing
  }
}

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session, requestId: string, eventId: string) {
  console.log(`🔍 [${requestId}] Handling checkout completed:`, session.id);
  
  const userId = session.metadata?.user_id || (session as any).client_reference_id;
  const planType = session.metadata?.plan_type || 'pro';
  
  if (!userId) {
    console.error(`❌ [${requestId}] Missing user_id in checkout session:`, {
      metadata: session.metadata,
      client_reference_id: (session as any).client_reference_id,
    });
    throw new Error('Missing required user_id in checkout session');
  }
  
  console.log(`✅ [${requestId}] Processing checkout for user:`, userId);
  
  try {
    const stripe = getStripeServer();
    
    // Get subscription if it exists
    let subscriptionId: string | null = null;
    let subscriptionStatus: string = 'active';
    let currentPeriodStart: string | null = null;
    let currentPeriodEnd: string | null = null;
    
    if (session.subscription) {
      subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription.id;
      
      // Retrieve full subscription to get status and period dates
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        subscriptionStatus = subscription.status;
        currentPeriodStart = toIsoOrNull((subscription as any).current_period_start);
        currentPeriodEnd = toIsoOrNull((subscription as any).current_period_end);
        
        // Use subscription metadata if session metadata is missing
        if (!planType && subscription.metadata?.plan_type) {
          const subPlanType = subscription.metadata.plan_type;
          console.log(`ℹ️ [${requestId}] Using plan type from subscription metadata:`, subPlanType);
        }
        
        console.log(`✅ [${requestId}] Retrieved subscription:`, {
          id: subscriptionId,
          status: subscriptionStatus,
          periodEnd: currentPeriodEnd,
        });
      } catch (subError: any) {
        console.warn(`⚠️ [${requestId}] Could not retrieve subscription ${subscriptionId}:`, subError.message);
        // Continue with what we have
      }
    }
    
    // Map subscription status to our plan status
    const planStatus = mapStripeStatusToPlanStatus(subscriptionStatus) as any;
    
    // Build setPlan options, only including period dates if we have them
    const setPlanOptions: any = {
      userId,
      planType: planType as 'free' | 'pro',
      status: planStatus,
      stripeSubscriptionId: subscriptionId || null,
      stripeEventId: eventId,
    };
    
    // Only include period dates if we successfully retrieved them
    if (currentPeriodStart) {
      setPlanOptions.currentPeriodStart = currentPeriodStart;
    }
    if (currentPeriodEnd) {
      setPlanOptions.currentPeriodEnd = currentPeriodEnd;
    }
    
    await setPlan(setPlanOptions);
    
    console.log(`✅ [${requestId}] User plan updated successfully:`, {
      userId,
      planType,
      status: planStatus,
      subscriptionId,
    });

    // Auto-enable email alerts when upgrading to Pro
    if (planType === 'pro' && (planStatus === 'active' || planStatus === 'trialing')) {
      await enableEmailAlertsForUser(userId, requestId, { force: true });
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to update user plan:`, error);
    throw error;
  }
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription, requestId: string, eventId: string) {
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
    const startIso = toIsoOrNull((subscription as any).current_period_start);
    const endIso = toIsoOrNull((subscription as any).current_period_end);
    
    const planStatus = mapStripeStatusToPlanStatus(subscription.status) as any;
    
    await setPlan({
      userId,
      planType: subscription.status === 'trialing' ? 'pro' : 'pro', // Ensure Pro during trial
      status: planStatus,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: startIso,
      currentPeriodEnd: endIso,
      stripeEventId: eventId,
    });
    
    console.log(`✅ [${requestId}] Subscription created:`, {
      status: subscription.status,
      periodEnd: endIso,
    });

    // Auto-enable email alerts when creating Pro subscription
    if (planStatus === 'active' || planStatus === 'trialing') {
      await enableEmailAlertsForUser(userId, requestId, { force: true });
    }
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to update subscription details:`, error);
    throw error;
  }
}

/**
 * Handle subscription updates
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription, requestId: string, eventId: string) {
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
    const startIso = toIsoOrNull((subscription as any).current_period_start);
    const endIso = toIsoOrNull((subscription as any).current_period_end);
    
    // Handle specific lifecycle events
    // Note: subscription.status can be 'canceled' even if TypeScript types don't show it
    const stripeStatus = subscription.status as string;
    let planType: 'free' | 'pro' = 'pro';
    if (stripeStatus === 'canceled' || stripeStatus === 'cancelled') {
      planType = 'free'; // Downgrade to free on cancellation
      console.log(`❌ [${requestId}] Subscription cancelled, downgrading to free`);
    }
    
    await setPlan({
      userId,
      planType,
      status: mapStripeStatusToPlanStatus(stripeStatus) as any,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: startIso,
      currentPeriodEnd: endIso,
      stripeEventId: eventId,
    });
    
    console.log(`✅ [${requestId}] Subscription updated:`, {
      status: subscription.status,
      periodEnd: endIso,
    });
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to update subscription:`, error);
    throw error;
  }
}

/**
 * Handle trial will end notification
 */
async function handleTrialWillEnd(subscription: Stripe.Subscription, requestId: string) {
  console.log(`🔍 [${requestId}] Handling trial will end:`, subscription.id);
  
  const userId = subscription.metadata?.user_id;
  
  if (!userId) {
    console.error(`❌ [${requestId}] Missing user_id in subscription metadata:`, {
      subscriptionId: subscription.id,
      metadata: subscription.metadata,
    });
    throw new Error('Missing user_id in subscription metadata');
  }
  
  try {
    // Get user email for notification
    const client = getSupabaseClient();
    const { data: user, error: userError } = await (client as any)
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error(`❌ [${requestId}] Could not find user:`, userError);
      throw new Error('User not found');
    }

    // Send trial ending notification email
    await sendTrialEndingNotification({
      email: user.email,
      name: user.name,
      trialEndDate: new Date(subscription.trial_end! * 1000).toISOString(),
    });

    console.log(`✅ [${requestId}] Trial ending notification sent to ${user.email}`);
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to handle trial will end:`, error);
    throw error;
  }
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription, requestId: string, eventId: string) {
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
    await setPlan({
      userId,
      planType: 'free',
      status: 'cancelled',
      stripeSubscriptionId: null,
      stripeEventId: eventId,
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
async function handlePaymentSucceeded(invoice: Stripe.Invoice, requestId: string, eventId: string) {
  console.log(`🔍 [${requestId}] Handling payment succeeded:`, invoice.id);
  
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) {
    console.log(`ℹ️ [${requestId}] No subscription associated with invoice`);
    return;
  }
  
  try {
    // Find user by subscription ID
    const client = getSupabaseClient();
    const { data: rows, error: selErr } = await (client as any)
      .from('plans')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (selErr || !rows) {
      console.error(`❌ [${requestId}] Could not resolve user by subscription id:`, selErr);
      throw new Error(`Could not resolve user by subscription id: ${selErr?.message || 'No data'}`);
    }

    const userId = (rows as any).user_id;
    
    await setPlan({
      userId,
      planType: 'pro',
      status: 'active',
      stripeEventId: eventId,
    });
    
    console.log(`✅ [${requestId}] Plan status updated to active`);

    // Auto-enable email alerts when payment succeeds for Pro subscription
    await enableEmailAlertsForUser(userId, requestId);
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to update plan status:`, error);
    throw error;
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice, requestId: string, eventId: string) {
  console.log(`🔍 [${requestId}] Handling payment failed:`, invoice.id);
  
  const subscriptionId = (invoice as any).subscription as string;
  
  if (!subscriptionId) {
    console.log(`ℹ️ [${requestId}] No subscription associated with invoice`);
    return;
  }
  
  try {
    // Find user by subscription ID
    const client = getSupabaseClient();
    const { data: rows, error: selErr } = await (client as any)
      .from('plans')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (selErr || !rows) {
      console.error(`❌ [${requestId}] Could not resolve user by subscription id:`, selErr);
      throw new Error(`Could not resolve user by subscription id: ${selErr?.message || 'No data'}`);
    }

    await setPlan({
      userId: (rows as any).user_id,
      planType: 'pro', // Keep as pro, just mark as past_due
      status: 'past_due',
      stripeEventId: eventId,
    });
    
    console.log(`✅ [${requestId}] Plan status updated to past_due`);
  } catch (error) {
    console.error(`❌ [${requestId}] Failed to update plan status:`, error);
    throw error;
  }
}

/**
 * Send trial ending notification email
 */
async function sendTrialEndingNotification(data: {
  email: string;
  name: string;
  trialEndDate: string;
}): Promise<void> {
  try {
    // This would integrate with your email service
    // For now, just log the notification
    console.log('📧 Trial ending notification:', {
      email: data.email,
      name: data.name,
      trialEndDate: data.trialEndDate,
    });
    
    // TODO: Implement actual email sending
    // await sendEmail({
    //   to: data.email,
    //   subject: 'Your DogYenta trial is ending soon',
    //   template: 'trial-ending',
    //   data: {
    //     name: data.name,
    //     trialEndDate: data.trialEndDate,
    //   }
    // });
  } catch (error) {
    console.error('Failed to send trial ending notification:', error);
    // Don't throw - this is not critical for webhook processing
  }
}
