/**
 * Plan synchronization utilities for Stripe and database
 * Handles reconciliation, validation, and sync operations
 */

import { getStripeServer } from './config';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { appConfig } from '@/lib/config';

export type PlanType = 'free' | 'pro';
export type PlanStatus = 'active' | 'past_due' | 'cancelled' | 'incomplete' | 'trialing' | 'unpaid' | 'unknown';

export interface SetPlanOptions {
  userId: string;
  planType: PlanType;
  status?: PlanStatus;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  stripeEventId?: string; // For idempotency tracking
}

export interface PlanSyncResult {
  success: boolean;
  synced: number;
  errors: number;
  details: Array<{
    userId: string;
    action: 'created' | 'updated' | 'skipped' | 'error';
    error?: string;
  }>;
}

export interface PlanMismatch {
  userId: string;
  userEmail: string;
  dbPlan: {
    plan_type: string;
    status: string;
    stripe_subscription_id: string | null;
  };
  stripePlan: {
    status: string;
    subscription_id: string;
    current_period_end: number;
  } | null;
  mismatchType: 'missing_subscription' | 'status_mismatch' | 'subscription_not_found';
}

/**
 * Sync all user plans with Stripe subscriptions
 */
export async function syncAllPlansWithStripe(): Promise<PlanSyncResult> {
  console.log('🔄 Starting plan synchronization with Stripe...');
  
  const result: PlanSyncResult = {
    success: true,
    synced: 0,
    errors: 0,
    details: []
  };

  try {
    const client = getSupabaseClient();
    const stripe = getStripeServer();

    // Get all users with Pro plans
    const { data: plans, error: plansError } = await (client as any)
      .from('plans')
      .select(`
        user_id,
        plan_type,
        status,
        stripe_subscription_id,
        users!inner(email, name)
      `)
      .eq('plan_type', 'pro');

    if (plansError) {
      throw new Error(`Failed to fetch plans: ${plansError.message}`);
    }

    console.log(`📊 Found ${plans?.length || 0} Pro plans to sync`);

    // Process each plan
    for (const plan of plans || []) {
      try {
        const userId = plan.user_id;
        const userEmail = plan.users?.email;
        const subscriptionId = plan.stripe_subscription_id;

        if (!subscriptionId) {
          console.log(`⚠️ User ${userEmail} has Pro plan but no Stripe subscription ID`);
          result.details.push({
            userId,
            action: 'error',
            error: 'Missing Stripe subscription ID'
          });
          result.errors++;
          continue;
        }

        // Fetch subscription from Stripe
        let stripeSubscription;
        try {
          stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        } catch (stripeError: any) {
          if (stripeError.code === 'resource_missing') {
            console.log(`❌ Stripe subscription ${subscriptionId} not found for user ${userEmail}`);
            result.details.push({
              userId,
              action: 'error',
              error: 'Stripe subscription not found'
            });
            result.errors++;
            continue;
          }
          throw stripeError;
        }

        // Check for mismatches and sync
        const needsUpdate = await checkPlanMismatch(plan, stripeSubscription);
        
        if (needsUpdate) {
          await syncUserPlan(userId, stripeSubscription);
          result.details.push({
            userId,
            action: 'updated'
          });
          result.synced++;
        } else {
          result.details.push({
            userId,
            action: 'skipped'
          });
        }

      } catch (error) {
        console.error(`❌ Error syncing plan for user ${plan.user_id}:`, error);
        result.details.push({
          userId: plan.user_id,
          action: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.errors++;
      }
    }

    console.log(`✅ Plan synchronization completed: ${result.synced} synced, ${result.errors} errors`);
    return result;

  } catch (error) {
    console.error('❌ Plan synchronization failed:', error);
    result.success = false;
    return result;
  }
}

/**
 * Check if a plan needs synchronization with Stripe
 */
async function checkPlanMismatch(
  dbPlan: any, 
  stripeSubscription: any
): Promise<boolean> {
  // Map Stripe status to our status
  const stripeStatus = mapStripeStatusToPlanStatus(stripeSubscription.status);
  
  // Check status mismatch
  if (dbPlan.status !== stripeStatus) {
    console.log(`🔄 Status mismatch for user ${dbPlan.user_id}: DB=${dbPlan.status}, Stripe=${stripeStatus}`);
    return true;
  }

  // Check if we need to update period dates
  const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();
  if (dbPlan.current_period_end !== currentPeriodEnd) {
    console.log(`🔄 Period end mismatch for user ${dbPlan.user_id}`);
    return true;
  }

  return false;
}

/**
 * Sync a single user's plan with Stripe data
 */
async function syncUserPlan(userId: string, stripeSubscription: any): Promise<void> {
  const client = getSupabaseClient();
  
  const updateData = {
    status: mapStripeStatusToPlanStatus(stripeSubscription.status),
    current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await (client as any)
    .from('plans')
    .update(updateData)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to update plan: ${error.message}`);
  }

  console.log(`✅ Synced plan for user ${userId}`);
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
 * Find plan mismatches between database and Stripe
 */
export async function findPlanMismatches(): Promise<PlanMismatch[]> {
  console.log('🔍 Scanning for plan mismatches...');
  
  const mismatches: PlanMismatch[] = [];
  
  try {
    const client = getSupabaseClient();
    const stripe = getStripeServer();

    // Get all Pro plans
    const { data: plans, error: plansError } = await (client as any)
      .from('plans')
      .select(`
        user_id,
        plan_type,
        status,
        stripe_subscription_id,
        users!inner(email, name)
      `)
      .eq('plan_type', 'pro');

    if (plansError) {
      throw new Error(`Failed to fetch plans: ${plansError.message}`);
    }

    for (const plan of plans || []) {
      const subscriptionId = plan.stripe_subscription_id;
      
      if (!subscriptionId) {
        mismatches.push({
          userId: plan.user_id,
          userEmail: plan.users?.email,
          dbPlan: {
            plan_type: plan.plan_type,
            status: plan.status,
            stripe_subscription_id: plan.stripe_subscription_id
          },
          stripePlan: null,
          mismatchType: 'missing_subscription'
        });
        continue;
      }

      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        const expectedStatus = mapStripeStatusToPlanStatus(stripeSubscription.status);
        
        if (plan.status !== expectedStatus) {
          mismatches.push({
            userId: plan.user_id,
            userEmail: plan.users?.email,
            dbPlan: {
              plan_type: plan.plan_type,
              status: plan.status,
              stripe_subscription_id: plan.stripe_subscription_id
            },
            stripePlan: {
              status: stripeSubscription.status,
              subscription_id: subscriptionId,
              current_period_end: (stripeSubscription as any).current_period_end
            },
            mismatchType: 'status_mismatch'
          });
        }
      } catch (stripeError: any) {
        if (stripeError.code === 'resource_missing') {
          mismatches.push({
            userId: plan.user_id,
            userEmail: plan.users?.email,
            dbPlan: {
              plan_type: plan.plan_type,
              status: plan.status,
              stripe_subscription_id: plan.stripe_subscription_id
            },
            stripePlan: null,
            mismatchType: 'subscription_not_found'
          });
        } else {
          console.error(`Error checking subscription ${subscriptionId}:`, stripeError);
        }
      }
    }

    console.log(`🔍 Found ${mismatches.length} plan mismatches`);
    return mismatches;

  } catch (error) {
    console.error('❌ Error finding plan mismatches:', error);
    throw error;
  }
}

/**
 * Validate plan data consistency
 */
export async function validatePlanConsistency(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  try {
    const client = getSupabaseClient();

    // Check for users with Pro plans but no Stripe subscription
    const { data: proPlansWithoutStripe, error: proError } = await (client as any)
      .from('plans')
      .select('user_id, users!inner(email)')
      .eq('plan_type', 'pro')
      .is('stripe_subscription_id', null);

    if (proError) {
      issues.push(`Failed to check Pro plans without Stripe: ${proError.message}`);
    } else if (proPlansWithoutStripe?.length > 0) {
      issues.push(`${proPlansWithoutStripe.length} Pro plans without Stripe subscription IDs`);
    }

    // Check for users with Stripe subscriptions but Free plans
    const { data: freePlansWithStripe, error: freeError } = await (client as any)
      .from('plans')
      .select('user_id, stripe_subscription_id, users!inner(email)')
      .eq('plan_type', 'free')
      .not('stripe_subscription_id', 'is', null);

    if (freeError) {
      issues.push(`Failed to check Free plans with Stripe: ${freeError.message}`);
    } else if (freePlansWithStripe?.length > 0) {
      issues.push(`${freePlansWithStripe.length} Free plans with Stripe subscription IDs`);
    }

    return {
      valid: issues.length === 0,
      issues
    };

  } catch (error) {
    issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { valid: false, issues };
  }
}

/**
 * Set user plan state with idempotent transitions
 * This is the central function for all plan updates - use this instead of direct DB updates
 */
export async function setPlan(options: SetPlanOptions): Promise<void> {
  const {
    userId,
    planType,
    status = 'active',
    stripeSubscriptionId = null,
    stripeCustomerId = null,
    currentPeriodStart = null,
    currentPeriodEnd = null,
    stripeEventId,
  } = options;

  const client = getSupabaseClient();

  // Check current plan state for idempotency (better than checking event records)
  const { data: currentPlan } = await (client as any)
    .from('plans')
    .select('plan_type, status, stripe_subscription_id')
    .eq('user_id', userId)
    .maybeSingle();

  // If plan is already in the desired state, skip update (idempotent)
  if (currentPlan && 
      currentPlan.plan_type === planType && 
      currentPlan.status === status &&
      (stripeSubscriptionId === null || currentPlan.stripe_subscription_id === stripeSubscriptionId)) {
    console.log(`ℹ️ Plan for user ${userId} already in desired state (${planType}/${status}), skipping update`);
    
    // Still record the event for audit purposes if provided
    if (stripeEventId) {
      try {
        await (client as any)
          .from('webhook_events')
          .insert({
            stripe_event_id: stripeEventId,
            event_type: 'plan_update',
            handled: true,
            request_id: `setPlan_${userId}_${Date.now()}`,
            processed_at: new Date().toISOString(),
          }).catch(() => {}); // Ignore duplicate event errors
      } catch (eventError) {
        // Ignore - this is just for audit
      }
    }
    return;
  }

  // If event ID provided, check if this exact event already processed this exact change
  // (prevent processing the same event twice)
  if (stripeEventId) {
    const { data: existingEvent } = await (client as any)
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', stripeEventId)
      .maybeSingle();

    if (existingEvent && currentPlan && 
        currentPlan.plan_type === planType && 
        currentPlan.status === status) {
      console.log(`ℹ️ Stripe event ${stripeEventId} already processed with same result, skipping plan update`);
      return; // Event already processed with same outcome
    }
    // Otherwise, proceed with update (might be a retry or correction)
  }

  // Build update payload
  const updatePayload: Record<string, any> = {
    plan_type: planType,
    status,
    updated_at: new Date().toISOString(),
  };

  if (stripeSubscriptionId !== undefined) {
    updatePayload.stripe_subscription_id = stripeSubscriptionId;
  }
  if (stripeCustomerId !== undefined) {
    updatePayload.stripe_customer_id = stripeCustomerId;
  }
  // Only include period dates if they're provided and not null
  // Note: These columns may not exist in all database instances
  if (currentPeriodStart) {
    updatePayload.current_period_start = currentPeriodStart;
  }
  if (currentPeriodEnd) {
    updatePayload.current_period_end = currentPeriodEnd;
  }

  // Update plan
  console.log(`🔄 Updating plan for user ${userId}:`, {
    planType,
    status,
    stripeSubscriptionId,
    updatePayload,
  });

  // Try to update with period dates first
  const { data: updateResult, error } = await (client as any)
    .from('plans')
    .update(updatePayload)
    .eq('user_id', userId)
    .select();

  // If we get a column error, retry without period date columns
  if (error && (
      error.message?.includes('current_period_start') || 
      error.message?.includes('current_period_end') ||
      error.message?.includes('schema cache'))) {
    console.warn(`⚠️ Column error detected: ${error.message}. Retrying without period date columns for user ${userId}`);
    
    // Remove period date columns and retry
    const safePayload = { ...updatePayload };
    delete safePayload.current_period_start;
    delete safePayload.current_period_end;
    
    const { data: retryResult, error: retryError } = await (client as any)
      .from('plans')
      .update(safePayload)
      .eq('user_id', userId)
      .select();
    
    if (retryError) {
      console.error(`❌ Failed to set plan for user ${userId} even after retry:`, retryError);
      throw new Error(`Failed to update plan: ${retryError.message}`);
    }
    
    if (!retryResult || retryResult.length === 0) {
      console.warn(`⚠️ Plan update returned no rows for user ${userId} - plan may not exist`);
      // Plan might not exist - try creating it without period dates
      const safeInsertPayload = { user_id: userId, ...safePayload, created_at: new Date().toISOString() };
      const { error: insertError } = await (client as any)
        .from('plans')
        .insert(safeInsertPayload);
      
      if (insertError) {
        console.error(`❌ Failed to create plan for user ${userId}:`, insertError);
        throw new Error(`Failed to create plan: ${insertError.message}`);
      }
      console.log(`✅ Created new plan for user ${userId}`);
      return;
    }
    
    console.log(`✅ Plan updated successfully for user ${userId} (without period dates):`, retryResult);
  } else if (error) {
    console.error(`❌ Failed to set plan for user ${userId}:`, error);
    throw new Error(`Failed to update plan: ${error.message}`);
  }

  if (!updateResult || updateResult.length === 0) {
    console.warn(`⚠️ Plan update returned no rows for user ${userId} - plan may not exist`);
    // Plan might not exist - try creating it
    const { error: insertError } = await (client as any)
      .from('plans')
      .insert({
        user_id: userId,
        ...updatePayload,
        created_at: new Date().toISOString(),
      });
    
    if (insertError) {
      console.error(`❌ Failed to create plan for user ${userId}:`, insertError);
      throw new Error(`Failed to create plan: ${insertError.message}`);
    }
    console.log(`✅ Created new plan for user ${userId}`);
  } else {
    console.log(`✅ Plan updated successfully for user ${userId}:`, updateResult);
  }

  // If Stripe event ID provided, record it for idempotency
  if (stripeEventId) {
    try {
      await (client as any)
        .from('webhook_events')
        .insert({
          stripe_event_id: stripeEventId,
          event_type: 'plan_update',
          handled: true,
          request_id: `setPlan_${userId}_${Date.now()}`,
          processed_at: new Date().toISOString(),
        });
    } catch (eventError) {
      // Log but don't fail - this is just for idempotency tracking
      console.warn(`⚠️ Failed to record Stripe event ID ${stripeEventId}:`, eventError);
    }
  }

  console.log(`✅ Plan set for user ${userId}: ${planType} (${status})`);
}
