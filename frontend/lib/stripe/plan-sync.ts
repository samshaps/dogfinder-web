/**
 * Plan synchronization utilities for Stripe and database
 * Handles reconciliation, validation, and sync operations
 */

import { getStripeServer } from './config';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { appConfig } from '@/lib/config';

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
              current_period_end: stripeSubscription.current_period_end
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
