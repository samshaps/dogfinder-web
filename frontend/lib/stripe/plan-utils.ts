/**
 * Utility functions for managing user plans and Stripe operations
 */

import { getSupabaseClient } from '@/lib/supabase-auth';
import { PLANS, PlanId } from './config';

/**
 * Get user's current plan information
 */
export async function getUserPlan(userId: string): Promise<{
  planType: PlanId;
  status: string;
  isPro: boolean;
  limits: any;
  features: string[];
} | null> {
  try {
    const client = getSupabaseClient();
    
    const { data, error } = await (client as any)
      .from('plans')
      .select('plan_type, status, stripe_subscription_id, current_period_end')
      .eq('user_id', userId)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error getting user plan:', error);
      throw error;
    }
    
    const planType = (data?.plan_type as PlanId) || 'FREE';
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
