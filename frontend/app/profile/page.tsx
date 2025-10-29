"use client";

import { useUser } from "@/lib/auth/user-context";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { useEffect, useState, useRef, Suspense } from "react";
import { trackEvent } from "@/lib/analytics/tracking";
import { useRouter, useSearchParams } from "next/navigation";
import { Edit, Crown, Star, AlertCircle, X } from "lucide-react";
import { getUserPlan } from "@/lib/stripe/plan-utils";
import { PLANS } from "@/lib/stripe/config";
import EmailAlertSettings from "@/components/EmailAlertSettings";

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

function ProfilePageContent() {
  const { user, signOut } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [pollingFailed, setPollingFailed] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxPollAttempts = 10; // Poll for up to 20 seconds (2s intervals)
  const pollAttemptsRef = useRef(0);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [downgrading, setDowngrading] = useState(false);
  const [downgradeSuccess, setDowngradeSuccess] = useState<{ periodEnd: string | null } | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);

  useEffect(() => {
    trackEvent("profile_viewed", {
      authenticated: true,
      user_id: user?.id,
    });

    // Check for upgrade success parameter
    const upgradeParam = searchParams?.get('upgrade');
    if (upgradeParam === 'success') {
      setUpgradeSuccess(true);
      // Remove the query parameter from URL
      router.replace('/profile', { scroll: false });
      
      // Immediately reload plan info
      if (user?.id) {
        loadPlanInfo();
        
        // Start polling for plan update (webhook might take a moment)
        startPollingForPlanUpdate();
      }
    } else if (user?.id) {
      loadPlanInfo();
    }

    // Cleanup polling on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [user, searchParams]);

  const loadPlanInfo = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const plan = await getUserPlan(user.id);
      setPlanInfo(plan);
      
      // If we're polling and plan is now Pro, stop polling
      if (plan?.isPro && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        pollAttemptsRef.current = 0;
        setUpgradeSuccess(false); // Clear success message once upgrade is confirmed
      }

      // Load billing information
      try {
        const billingResponse = await fetch('/api/stripe/billing-info');
        if (billingResponse.ok) {
          const billingData = await billingResponse.json();
          setBillingInfo(billingData);
          
          // If subscription is scheduled for cancellation, set downgrade success state
          if (billingData.isScheduledForCancellation && billingData.finalBillingDate) {
            setDowngradeSuccess({ periodEnd: billingData.finalBillingDate });
          } else {
            setDowngradeSuccess(null);
          }
        }
      } catch (error) {
        console.error('Error loading billing info:', error);
        // Don't fail the whole page load if this fails
      }
    } catch (error) {
      console.error('Error loading plan info:', error);
    } finally {
      setLoading(false);
    }
  };

  const startPollingForPlanUpdate = () => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollAttemptsRef.current = 0;
    setPollingFailed(false);
    
    // Poll every 2 seconds for plan update
    pollingIntervalRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;
      
      if (pollAttemptsRef.current >= maxPollAttempts) {
        // Stop polling after max attempts
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        pollAttemptsRef.current = 0;
        setPollingFailed(true);
        setUpgradeSuccess(false);
        console.warn('⏱️ Polling stopped: Plan update not detected within timeout');
        return;
      }
      
      // Reload plan info
      if (user?.id) {
        await loadPlanInfo();
      }
    }, 2000);
  };

  const handleDowngrade = async () => {
    if (!user?.id) return;

    try {
      setDowngrading(true);
      trackEvent('profile_downgrade_initiated', {
        user_id: user.id,
        source: 'profile_page'
      });

      const response = await fetch('/api/stripe/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to downgrade plan');
      }

      const data = await response.json();
      
      trackEvent('profile_downgrade_success', {
        user_id: user.id,
        periodEnd: data.periodEnd,
      });

      // Show success message
      setDowngradeSuccess({ periodEnd: data.periodEnd });
      setShowDowngradeModal(false);
      
      // Reload plan info and email alert settings to reflect changes
      await loadPlanInfo();
      
      // Trigger a refresh of email alert settings if EmailAlertSettings component exists
      // (it will auto-refresh on next render since we reloaded plan info)
    } catch (error: any) {
      console.error('Error downgrading:', error);
      alert(error.message || 'Failed to downgrade plan. Please try again or contact support.');
      trackEvent('profile_downgrade_failed', {
        user_id: user.id,
        error: error.message,
      });
    } finally {
      setDowngrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="page-section">
        <div className="container mx-auto max-w-2xl">
          <div className="card card-padding">
            <div className="text-center items-center space-y-2 mb-8">
              {user?.image && (
                <img
                  src={user.image}
                  alt={user.name}
                  className="h-24 w-24 rounded-full ring-2 ring-slate-200 mx-auto"
                />
              )}
              <h1 className="mb-2">
                Welcome, {user?.name}!
              </h1>
              <p className="text-slate-600">{user?.email}</p>
            </div>

            <div className="space-y-6">
              {/* Account Information */}
              <div>
                <h2 className="mb-4">
                  Account Information
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{user?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span className="font-medium capitalize">{user?.provider}</span>
                  </div>
                </div>
              </div>

              {/* Plan Information */}
              <div className="border-t pt-6">
                <h2 className="mb-4 flex items-center gap-2" id="plan-section">
                  {planInfo?.isPro ? (
                    <Crown className="w-5 h-5 text-yellow-500" aria-hidden="true" />
                  ) : (
                    <Star className="w-5 h-5 text-blue-500" aria-hidden="true" />
                  )}
                  Current Plan
                </h2>
                
                {upgradeSuccess && !planInfo?.isPro && pollingIntervalRef.current && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg" role="alert">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <p className="text-sm text-blue-900 font-medium">
                        Upgrade successful! Activating your Pro plan...
                      </p>
                    </div>
                  </div>
                )}
                {pollingFailed && !planInfo?.isPro && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg" role="alert">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="text-sm text-amber-900 font-medium mb-1">
                          Upgrade processing is taking longer than expected
                        </p>
                        <p className="text-xs text-amber-800">
                          Your payment was successful. Please refresh the page in a few moments, or contact support if the issue persists.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {loading ? (
                  <div className="bg-gray-50 rounded-lg p-4" role="status" aria-live="polite">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <p className="text-gray-600">Loading your plan information...</p>
                    </div>
                  </div>
                ) : planInfo ? (
                  <div className={`rounded-lg p-4 ${
                    planInfo.isPro 
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' 
                      : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'
                  }`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-gray-900">
                          {PLANS[planInfo.planType as keyof typeof PLANS]?.name || 'Free'} Plan
                        </span>
                        {planInfo.isPro && (
                          <span className="badge-warning">
                            Premium
                          </span>
                        )}
                      </div>
                      <span className={`badge ${
                        planInfo.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' 
                          : planInfo.status === 'trialing'
                          ? 'bg-blue-50 text-blue-700 ring-blue-200'
                          : planInfo.status === 'past_due'
                          ? 'bg-amber-50 text-amber-700 ring-amber-200'
                          : 'bg-slate-50 text-slate-700 ring-slate-200'
                      }`} aria-label={`Plan status: ${planInfo.status === 'active' ? 'Active' : 
                         planInfo.status === 'trialing' ? 'Free Trial' :
                         planInfo.status === 'past_due' ? 'Payment Required' :
                         planInfo.status}`}>
                        {planInfo.status === 'active' ? 'Active' : 
                         planInfo.status === 'trialing' ? 'Free Trial' :
                         planInfo.status === 'past_due' ? 'Payment Required' :
                         planInfo.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-700 mb-3" role="status">
                        {planInfo.isPro 
                          ? 'You have full access to all Pro features, including email alerts for new dog matches and unlimited searches.'
                          : 'Enjoy the free plan with basic search. Upgrade to Pro to receive email alerts when new dogs match your preferences and unlock unlimited searches.'
                        }
                      </p>
                      
                      {/* Billing Information */}
                      {billingInfo && (
                        <div className="mb-3 pt-3 border-t border-gray-200">
                          {planInfo.isPro && billingInfo.nextBillingDate && !billingInfo.isScheduledForCancellation && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Next billing date:</span>{' '}
                              {new Date(billingInfo.nextBillingDate).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          )}
                          {!planInfo.isPro && billingInfo.wasDowngradedFromPro && billingInfo.finalBillingDate && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Upcoming final billing date:</span>{' '}
                              {new Date(billingInfo.finalBillingDate).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          )}
                        </div>
                      )}

                      {planInfo.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-start">
                          <svg className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-slate-600">{feature}</span>
                        </div>
                      ))}
                      {planInfo.features.length > 3 && (
                        <p className="text-sm text-gray-600 ml-6">
                          +{planInfo.features.length - 3} more feature{planInfo.features.length - 3 !== 1 ? 's' : ''} available
                        </p>
                      )}
                    </div>
                    
                    {!planInfo.isPro && !billingInfo?.wasDowngradedFromPro && (
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            trackEvent('profile_upgrade_clicked', {
                              user_id: user?.id,
                              source: 'profile_page'
                            });
                            router.push('/pricing');
                          }}
                          className="w-full btn-primary"
                          aria-describedby="upgrade-description"
                        >
                          <span className="flex items-center justify-center gap-2">
                            <Crown className="w-4 h-4" aria-hidden="true" />
                            Upgrade to Pro Plan
                          </span>
                        </button>
                        <p id="upgrade-description" className="text-xs text-gray-600 text-center">
                          Unlock email alerts, unlimited searches, and all premium features for $9.99/month
                        </p>
                      </div>
                    )}

                    {/* Free user who downgraded from Pro */}
                    {!planInfo.isPro && billingInfo?.wasDowngradedFromPro && (
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            trackEvent('profile_manage_subscription_clicked', {
                              user_id: user?.id,
                              source: 'profile_page_downgraded_user'
                            });
                            router.push('/pricing');
                          }}
                          className="w-full btn-primary"
                        >
                          Manage Subscription
                        </button>
                        <p className="text-xs text-gray-600 text-center">
                          Re-subscribe to Pro before your plan expires to restore Pro features.
                        </p>
                      </div>
                    )}
                    
                    {planInfo.isPro && planInfo.status === 'trialing' && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg" role="alert">
                        <p className="text-sm text-blue-900 font-medium">
                          <span aria-hidden="true">🎉</span> You're currently in your free trial period. Enjoy access to all Pro features!
                        </p>
                      </div>
                    )}

                    {planInfo.isPro && (
                      <div className="mt-3 space-y-3">
                        {downgradeSuccess?.periodEnd && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg" role="alert">
                            <div className="space-y-3">
                              <p className="text-sm text-amber-900 font-medium">
                                Your Pro plan will end on {new Date(downgradeSuccess.periodEnd).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}.
                              </p>
                              <p className="text-xs text-amber-800">
                                Email alerts have been disabled. You'll lose access to Pro features when your plan expires.
                              </p>
                              <button
                                onClick={() => {
                                  trackEvent('profile_manage_subscription_clicked', {
                                    user_id: user?.id,
                                    source: 'downgrade_success_message'
                                  });
                                  router.push('/pricing');
                                }}
                                className="w-full btn-primary-sm"
                              >
                                Manage Subscription
                              </button>
                            </div>
                          </div>
                        )}
                        {!downgradeSuccess?.periodEnd && (
                          <>
                            <button
                              onClick={() => {
                                trackEvent('profile_manage_subscription_clicked', {
                                  user_id: user?.id,
                                  source: 'profile_page_pro_user'
                                });
                                router.push('/pricing');
                              }}
                              className="w-full btn-primary-sm"
                            >
                              Manage Subscription
                            </button>
                            <p className="text-xs text-gray-600 text-center">
                              Manage your subscription or downgrade to Free Plan
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" aria-hidden="true" />
                      <p className="text-red-800 font-medium">Unable to load plan information</p>
                    </div>
                    <p className="text-red-700 text-sm mt-1">
                      Please refresh the page or contact support if this issue persists.
                    </p>
                  </div>
                )}
              </div>

              {/* Edit Preferences Button */}
              <div className="border-t pt-6">
                <h3 className="mb-3">Search Preferences</h3>
                <button
                  onClick={() => {
                    trackEvent("preferences_viewed", {
                      user_id: user?.id,
                      source: "profile_page"
                    });
                    router.push('/find');
                  }}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                  aria-describedby="preferences-description"
                >
                  <Edit className="w-5 h-5" aria-hidden="true" />
                  Edit My Search Preferences
                </button>
                <p id="preferences-description" className="text-sm text-gray-500 text-center mt-2">
                  Customize your dog search criteria including breed, size, age, and location
                </p>
              </div>

              {/* Email Alerts Section */}
              <div className="border-t pt-6">
                <EmailAlertSettings />
              </div>

              {/* Search History Section */}
              <div className="border-t pt-6">
                <h2 className="mb-4" id="search-history-section">
                  Search History
                </h2>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="mb-2">Search History Coming Soon</h3>
                  <p className="body-text text-sm mb-4">
                    We're working on a feature to track your past searches so you can easily revisit dogs you've found.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>In development</span>
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <div className="border-t pt-6">
                <button
                  onClick={signOut}
                  className="w-full btn-primary bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
                  aria-describedby="signout-description"
                >
                  Sign Out
                </button>
                <p id="signout-description" className="text-sm text-gray-500 text-center mt-2">
                  You can sign back in anytime with your existing account
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Downgrade Confirmation Modal */}
      {showDowngradeModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => !downgrading && setShowDowngradeModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="downgrade-modal-title"
        >
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 id="downgrade-modal-title" className="text-gray-900">
                Downgrade to Free?
              </h2>
              <button
                onClick={() => !downgrading && setShowDowngradeModal(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded"
                aria-label="Close modal"
                disabled={downgrading}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-700 mb-6">
              You'll keep your saved preferences, but:
            </p>
            <ul className="text-gray-700 mb-6 list-disc list-inside space-y-2 text-sm">
              <li>Email alerts will be <strong>immediately disabled</strong></li>
              <li>You'll lose access to Pro features when your plan expires</li>
              <li>Your Pro plan will remain active until the end of your current billing period</li>
            </ul>
            <p className="text-gray-700 mb-6 text-sm">
              You can re-subscribe anytime before your plan expires to restore Pro features.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => !downgrading && setShowDowngradeModal(false)}
                disabled={downgrading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDowngrade}
                disabled={downgrading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {downgrading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </span>
                ) : (
                  'Confirm Downgrade'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <ProfilePageContent />
      </Suspense>
    </ProtectedRoute>
  );
}

