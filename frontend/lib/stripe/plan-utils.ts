/**
 * Utility functions for managing user plans and Stripe operations
 */

import { getSupabaseClient } from '../supabase-auth';
import { PLANS, PlanId } from './config';

/**
 * Check if user can view their saved preferences
 * Only Pro users can see and use their saved preferences
 */
export function canViewPrefs(planInfo: { planType?: string; isPro?: boolean } | null): boolean {
  if (!planInfo) return false;
  return planInfo.isPro === true || planInfo.planType === 'PRO' || planInfo.planType?.toLowerCase() === 'pro';
}

/**
 * Get user's current plan information
 */
export async function getUserPlan(userIdOrEmail: string): Promise<{
  planType: PlanId;
  status: string;
  isPro: boolean;
  limits: any;
  features: string[];
} | null> {
  try {
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/stripe/plan-info', {
          credentials: 'include',
        });

        if (!response.ok) {
          console.error('Error fetching plan info from API:', response.status);
          return null;
        }

        const payload = await response.json();
        if (!payload?.success) {
          console.error('Plan info API responded with failure:', payload?.error || payload);
          return null;
        }

        return payload.data ?? null;
      } catch (fetchError) {
        console.error('Network error fetching plan info:', fetchError);
        return null;
      }
    }

    const client = getSupabaseClient();
    
    // Resolve user_id if we received an email or non-UUID identifier
    let userId: string = userIdOrEmail;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userIdOrEmail);
    if (!isUuid) {
      const { data: userRow, error: userErr } = await (client as any)
        .from('users')
        .select('id')
        .eq('email', userIdOrEmail)
        .single();
      if (userErr || !userRow?.id) {
        console.error('Error resolving user id from email:', userErr || userRow);
        return null;
      }
      userId = (userRow as any).id as string;
    }

    const { data, error } = await (client as any)
      .from('plans')
      .select('plan_type, status, stripe_subscription_id, current_period_end')
      .eq('user_id', userId)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error getting user plan:', error);
      throw error;
    }
    
    const rawType = (data?.plan_type ?? 'free') as string;
    const normalized = rawType.toLowerCase() === 'pro' ? 'PRO' : 'FREE';
    const planType = normalized as PlanId;
    const plan = PLANS[planType];
    
    return {
      planType,
      status: data?.status || 'active',
      isPro: planType === 'PRO',
      limits: plan.limits,
      features: [...plan.features]
    };
    
  } catch (error) {
    console.error('Error in getUserPlan:', error);
    return null;
  }
}

/**
 * Check if user has reached their daily search limit
 */
export async function checkSearchLimit(userId: string): Promise<{
  canSearch: boolean;
  searchesRemaining: number;
  limit: number;
}> {
  try {
    const planInfo = await getUserPlan(userId);
    
    if (!planInfo) {
      return { canSearch: false, searchesRemaining: 0, limit: 0 };
    }
    
    // Pro users have unlimited searches
    if (planInfo.isPro) {
      return { canSearch: true, searchesRemaining: -1, limit: -1 };
    }
    
    // For free users, check daily search count
    // TODO: Implement daily search tracking
    // For now, assume they can search
    const dailyLimit = planInfo.limits.searchesPerDay;
    
    return {
      canSearch: true, // TODO: Check actual search count
      searchesRemaining: dailyLimit,
      limit: dailyLimit
    };
    
  } catch (error) {
    console.error('Error checking search limit:', error);
    return { canSearch: false, searchesRemaining: 0, limit: 0 };
  }
}

/**
 * Check if user can access a feature
 */
export function canAccessFeature(planInfo: any, feature: string): boolean {
  if (!planInfo) return false;
  
  switch (feature) {
    case 'emailAlerts':
      return planInfo.limits.emailAlerts;
    case 'prioritySupport':
      return planInfo.limits.prioritySupport;
    case 'unlimitedSearches':
      return planInfo.limits.searchesPerDay === -1;
    default:
      return false;
  }
}

/**
 * Get upgrade URL for Pro plan
 */
export async function getUpgradeUrl(userId: string): Promise<string | null> {
  try {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      console.error('Failed to create checkout session:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.url;
    
  } catch (error) {
    console.error('Error getting upgrade URL:', error);
    return null;
  }
}
