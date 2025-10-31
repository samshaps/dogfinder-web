'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useUser } from '@/lib/auth/user-context';
import { getUserPlan } from '@/lib/stripe/plan-utils';
import { PLANS } from '@/lib/stripe/config';
import { trackEvent } from '@/lib/analytics/tracking';
import { useSearchParams } from 'next/navigation';

interface PlanInfo {
  planType: string;
  status: string;
  isPro: boolean;
  limits: any;
  features: string[];
}

interface BillingInfo {
  planType: string;
  hasActiveSubscription: boolean;
  isScheduledForCancellation: boolean;
  nextBillingDate: string | null;
  finalBillingDate?: string | null;
  wasDowngradedFromPro: boolean;
}

function PricingPageContent() {
  const { user, isLoading: userLoading } = useUser();
  const searchParams = useSearchParams();
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [downgrading, setDowngrading] = useState(false);
  const [downgradeSuccess, setDowngradeSuccess] = useState<{ periodEnd: string | null } | null>(null);
  const upgradeTriggeredRef = useRef(false);

  useEffect(() => {
    // Track page view
    trackEvent('pricing_page_viewed', {
      source: 'direct',
      authenticated: !!user,
    });

    if (user) {
      loadPlanInfo();
    }
  }, [user]);

  // Auto-trigger upgrade flow if user just authenticated and has action=upgrade in URL
  useEffect(() => {
    // Check both searchParams and window.location as fallback
    const action = searchParams.get('action') || 
                   (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('action') : null);
    
    // Wait for user to be authenticated, user loading to complete, page loading to complete, and not already upgrading
    // Also check that we haven't already triggered the upgrade
    const canProceed = action === 'upgrade' && 
                       user && 
                       !userLoading && 
                       !upgrading && 
                       !loading && 
                       !upgradeTriggeredRef.current;
    
    if (canProceed) {
      console.log('🚀 Auto-triggering upgrade flow after authentication', {
        action,
        hasUser: !!user,
        userLoading,
        upgrading,
        loading,
        alreadyTriggered: upgradeTriggeredRef.current
      });
      
      // Mark that we're about to trigger upgrade to prevent duplicate triggers
      upgradeTriggeredRef.current = true;
      
      // Delay to ensure everything is ready, especially after auth redirect
      const timer = setTimeout(async () => {
        // Double-check we're still in a valid state before proceeding
        if (upgrading || loading || userLoading || !user) {
          console.log('⚠️ Upgrade trigger cancelled - state changed', {
            upgrading,
            loading,
            userLoading,
            hasUser: !!user
          });
          upgradeTriggeredRef.current = false;
          return;
        }
        
        try {
          console.log('✅ Proceeding with checkout session creation');
          setUpgrading(true);
          trackEvent('pricing_cta_pro', {
            authenticated: true,
            current_plan: planInfo?.planType || 'free',
            action: billingInfo?.isScheduledForCancellation ? 'resubscribe' : 'upgrade',
            source: 'auto_redirect_after_auth'
          });

          const response = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!response.ok) {
            throw new Error('Failed to create checkout session');
          }

          const { url } = await response.json();
          
          if (url) {
            console.log('✅ Redirecting to Stripe checkout');
            // Clean up URL by removing the action parameter before redirect
            const urlObj = new URL(window.location.href);
            urlObj.searchParams.delete('action');
            window.history.replaceState({}, '', urlObj.toString());
            
            // Redirect to Stripe checkout
            window.location.href = url;
          } else {
            throw new Error('No checkout URL returned');
          }
        } catch (error) {
          console.error('❌ Error upgrading:', error);
          alert('Failed to start upgrade process. Please try again.');
          setUpgrading(false);
          // Reset the ref on error so user can try again
          upgradeTriggeredRef.current = false;
        }
      }, 1000); // Increased delay to ensure auth state is fully resolved
      return () => clearTimeout(timer);
    }
    
    // Reset ref if action parameter is removed (e.g., user navigates away and back)
    if (action !== 'upgrade') {
      upgradeTriggeredRef.current = false;
    }
  }, [user, userLoading, searchParams, upgrading, loading, planInfo, billingInfo]);

  // Check if downgrade is scheduled on mount (persist success message on page reload)
  useEffect(() => {
    if (user && billingInfo?.isScheduledForCancellation && billingInfo.finalBillingDate) {
      setDowngradeSuccess({ periodEnd: billingInfo.finalBillingDate });
    } else if (!billingInfo?.isScheduledForCancellation) {
      // Clear success message if not scheduled
      setDowngradeSuccess(null);
    }
  }, [billingInfo, user]);

  const loadPlanInfo = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const plan = await getUserPlan(user.id);
      setPlanInfo(plan);

      // Load billing information
      try {
        const billingResponse = await fetch('/api/stripe/billing-info', {
          credentials: 'include',
        });
        if (billingResponse.ok) {
          const billingResponseData = await billingResponse.json();
          // Extract data from wrapped response
          const billingData = billingResponseData.data || billingResponseData;
          setBillingInfo(billingData);
        }
      } catch (error) {
        console.error('Error loading billing info:', error);
      }
    } catch (error) {
      console.error('Error loading plan info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user) {
      trackEvent('pricing_cta_pro', {
        authenticated: false,
        current_plan: 'guest',
      });
      // Redirect to sign in with callback URL to return to pricing with upgrade action
      window.location.href = '/auth/signin?callbackUrl=' + encodeURIComponent('/pricing?action=upgrade');
      return;
    }

    try {
      setUpgrading(true);
      trackEvent('pricing_cta_pro', {
        authenticated: true,
        current_plan: planInfo?.planType || 'free',
        action: billingInfo?.isScheduledForCancellation ? 'resubscribe' : 'upgrade'
      });

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error upgrading:', error);
      alert('Failed to start upgrade process. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!user) {
      // Redirect to sign in if not authenticated
      trackEvent('pricing_downgrade_initiated', {
        authenticated: false,
        source: 'pricing_page'
      });
      window.location.href = '/auth/signin?callbackUrl=' + encodeURIComponent('/pricing');
      return;
    }

    try {
      setDowngrading(true);
      trackEvent('pricing_downgrade_initiated', {
        user_id: user.id,
        source: 'pricing_page'
      });

      const response = await fetch('/api/stripe/downgrade', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Handle wrapped error response
        const errorMessage = errorData.error?.message || errorData.error || 'Failed to downgrade plan';
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      
      // Extract data from wrapped response: { success: true, data: { periodEnd, message }, meta: {...} }
      const data = responseData.data || responseData;
      const periodEnd = data.periodEnd;
      
      console.log('📥 Downgrade API response:', { responseData, data, periodEnd });
      
      if (!periodEnd) {
        console.warn('⚠️ No periodEnd in response:', data);
      }
      
      trackEvent('pricing_downgrade_success', {
        user_id: user.id,
        periodEnd,
      });

      // Show success message with expiration date immediately
      if (periodEnd) {
        console.log('✅ Setting downgradeSuccess state with periodEnd:', periodEnd);
        setDowngradeSuccess({ periodEnd });
      } else {
        console.error('❌ No periodEnd in API response, cannot show success message');
      }

      // Force reload billing info first to get updated cancellation status
      try {
        const billingResponse = await fetch('/api/stripe/billing-info', {
          credentials: 'include',
        });
        if (billingResponse.ok) {
          const billingResponseData = await billingResponse.json();
          // Extract data from wrapped response
          const billingData = billingResponseData.data || billingResponseData;
          console.log('📥 Billing info response:', { billingResponseData, billingData });
          setBillingInfo(billingData);
          
          // Also set success message from billing data if needed (fallback)
          if (billingData.isScheduledForCancellation && billingData.finalBillingDate && !periodEnd) {
            console.log('✅ Using billingData.finalBillingDate as fallback:', billingData.finalBillingDate);
            setDowngradeSuccess({ periodEnd: billingData.finalBillingDate });
          }
        }
      } catch (error) {
        console.error('Error reloading billing info:', error);
      }

      // Reload plan info to reflect changes
      await loadPlanInfo();
      
      // Scroll to top to show success message
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      console.error('Error downgrading:', error);
      
      // Check if it's an authentication error
      if (error.message?.includes('Authentication') || error.message?.includes('401')) {
        alert('Your session may have expired. Please sign in again.');
        window.location.href = '/auth/signin?callbackUrl=' + encodeURIComponent('/pricing');
      } else {
        alert(error.message || 'Failed to downgrade plan. Please try again or contact support.');
      }
      
      trackEvent('pricing_downgrade_failed', {
        user_id: user?.id,
        error: error.message,
      });
    } finally {
      setDowngrading(false);
    }
  };

  const currentPlan = planInfo?.planType || 'FREE';
  const isPro = planInfo?.isPro || false;

  return (
    <div className="min-h-screen bg-surface-gradient">
      <div className="page-section">
        <div className="container mx-auto text-center">
          <h1>
            Never Miss Your Perfect Pup Again!
          </h1>
          <p className="mt-2 lead text-measure-wide mx-auto mb-12">
            Get instant email alerts when new dogs matching your exact preferences are available.
            Your furry best friend is just an email away.
          </p>
          
          {user && (
            <div className="mb-8">
              <p className="text-lg text-gray-700">
                Current plan: <span className="font-semibold text-blue-600">
                  {PLANS[currentPlan as keyof typeof PLANS]?.name || 'Free'}
                </span>
              </p>
            </div>
          )}

          {/* Downgrade Success Message */}
          {(downgradeSuccess?.periodEnd || billingInfo?.isScheduledForCancellation) && (
            <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-200 rounded-2xl shadow-lg max-w-2xl mx-auto">
              <div className="space-y-3">
                <h2 className="text-amber-900">
                  Downgrade Successful
                </h2>
                <p className="text-amber-900 font-medium">
                  Your Pro plan will end on {(() => {
                    const dateStr = downgradeSuccess?.periodEnd || billingInfo?.finalBillingDate;
                    if (!dateStr) return 'the end of your billing period';
                    
                    try {
                      const date = new Date(dateStr);
                      if (isNaN(date.getTime())) {
                        console.error('Invalid date string:', dateStr);
                        return 'the end of your billing period';
                      }
                      return date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    } catch (error) {
                      console.error('Error formatting date:', error, dateStr);
                      return 'the end of your billing period';
                    }
                  })()}.
                </p>
                <p className="text-sm text-amber-800">
                  Email alerts have been disabled. You'll keep access to Pro features until your plan expires. 
                  You can re-subscribe anytime before then to restore Pro features.
                </p>
                <button
                  onClick={() => {
                    trackEvent('pricing_manage_subscription_clicked', {
                      user_id: user?.id,
                      source: 'downgrade_success_message'
                    });
                    // Scroll to Pro plan card
                    document.getElementById('pro-plan-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="mt-4 btn-primary-sm flex items-center justify-center"
                >
                  Re-subscribe to Pro
                </button>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-5 mt-12 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className={`card card-padding relative flex flex-col ${isPro ? '' : 'ring-2 ring-blue-600 shadow-md'}`}>
              {!isPro && (
                <div className="absolute top-6 left-6">
                  <span className="badge-success">Current Plan</span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="mb-2">Free Plan</h3>
                <div className="text-4xl font-extrabold mb-4">
                  $0<span className="text-base text-slate-500 align-baseline">/month</span>
                </div>
                <p className="body-text">Perfect for getting started and finding your ideal dog</p>
              </div>
              
              <ul className="space-y-3 mb-8 text-left flex-1">
                {PLANS.FREE.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="body-text">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {isPro && !billingInfo?.isScheduledForCancellation ? (
                  <button
                    onClick={handleDowngrade}
                    disabled={downgrading}
                    className={`w-full btn-primary ${downgrading ? 'opacity-50 cursor-not-allowed' : ''} bg-red-600 hover:bg-red-700 focus-visible:ring-red-600 flex items-center justify-center`}
                  >
                    {downgrading ? 'Processing...' : 'Downgrade to Free'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full btn-ghost opacity-50 cursor-not-allowed flex items-center justify-center"
                  >
                    {isPro && billingInfo?.isScheduledForCancellation ? 'Downgrade Scheduled' : 'Current Plan'}
                  </button>
                )}
              </div>
            </div>

            {/* Pro Plan */}
            <div id="pro-plan-card" className={`card card-padding relative flex flex-col ${isPro ? 'ring-2 ring-blue-600 shadow-md' : ''}`}>
              {!isPro && (
                <div className="absolute top-6 left-6">
                  <span className="badge-warning">Popular</span>
                </div>
              )}
              {isPro && (
                <div className="absolute top-6 left-6">
                  <span className="badge-success">Current Plan</span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="mb-2">Pro Plan</h3>
                <div className="text-4xl font-extrabold mb-4">
                  $9.99<span className="text-base text-slate-500 align-baseline">/month</span>
                </div>
                <p className="body-text">Unlock advanced features for a truly personalized experience</p>
              </div>
              
              <ul className="space-y-3 mb-8 text-left flex-1">
                {PLANS.PRO.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="body-text">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {isPro && !billingInfo?.isScheduledForCancellation ? (
                  <button
                    disabled
                    className="w-full btn-ghost opacity-50 cursor-not-allowed flex items-center justify-center"
                  >
                    Active Plan
                  </button>
                ) : (
                  <button
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className={`w-full btn-primary ${upgrading ? 'opacity-50 cursor-not-allowed' : ''} flex items-center justify-center`}
                  >
                    {upgrading 
                      ? 'Processing...' 
                      : billingInfo?.isScheduledForCancellation
                        ? 'Re-subscribe to Pro'
                        : billingInfo?.wasDowngradedFromPro
                          ? 'Re-subscribe to Pro'
                          : 'Upgrade to Pro'
                    }
                  </button>
                )}
                
                {billingInfo?.isScheduledForCancellation && billingInfo.finalBillingDate && (
                  <p className="caption mt-2 text-center">
                    Plan expires on {new Date(billingInfo.finalBillingDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Why DogYenta Email Alerts Section */}
          <div className="mt-20">
            <h2 className="mb-12 text-center">Why DogYenta Email Alerts?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="mb-2">Perfect Matches</h3>
                <p className="body-text">
                  Our advanced algorithm connects you with dogs that meet your exact criteria
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="mb-2">Instant Alerts</h3>
                <p className="body-text">
                  Be the first to know about new dogs that match your preferences
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="mb-2">Secure & Private</h3>
                <p className="body-text">
                  Your preferences and data are safe with us, always
                </p>
              </div>
            </div>
          </div>
          
          {loading && (
            <div className="text-center mt-8">
              <p className="text-gray-600">Loading plan information...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-gradient">
        <div className="page-section">
          <div className="container mx-auto text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-12"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <PricingPageContent />
    </Suspense>
  );
}

