/**
 * Feature Flags
 * 
 * Type-safe feature flags controlled by environment variables.
 * All flags are disabled by default in production for safety.
 */

export type FeatureFlag = 
  | 'pricing'
  | 'auth'
  | 'pro'
  | 'alerts'
  | 'payments';

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envVar = `NEXT_PUBLIC_FEATURE_${flag.toUpperCase()}`;
  const value = process.env[envVar];
  
  // Default to false if not set
  if (!value) return false;
  
  // Handle string boolean values
  return value.toLowerCase() === 'true';
}

/**
 * Get all feature flag states (useful for debugging)
 */
export function getAllFeatureFlags(): Record<FeatureFlag, boolean> {
  return {
    pricing: isFeatureEnabled('pricing'),
    auth: isFeatureEnabled('auth'),
    pro: isFeatureEnabled('pro'),
    alerts: isFeatureEnabled('alerts'),
    payments: isFeatureEnabled('payments'),
  };
}

/**
 * Feature flag hook for client components
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  return isFeatureEnabled(flag);
}

/**
 * Log feature flags to console (development only)
 */
export function logFeatureFlags(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('🚩 Feature Flags:', getAllFeatureFlags());
  }
}

