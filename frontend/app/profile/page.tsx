"use client";

import { useUser } from "@/lib/auth/user-context";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { useEffect, useState, useRef, Suspense } from "react";
import { trackEvent } from "@/lib/analytics/tracking";
import { useRouter, useSearchParams } from "next/navigation";
import { Edit, Crown, Star, AlertCircle, X, CheckCircle } from "lucide-react";
import { getUserPlan, canViewPrefs } from "@/lib/stripe/plan-utils";
import { PLANS } from "@/lib/stripe/config";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { useEmailAlerts } from "@/lib/hooks/use-email-alerts";

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
  const { preferences } = usePreferences();
  const { settings, isPro: emailIsPro, toggleAlerts, loading: emailLoading } = useEmailAlerts();
  const [showEmailTooltip, setShowEmailTooltip] = useState(false);
  const previousPlanRef = useRef<{ isPro: boolean } | null>(null);
  const [showUpgradeToast, setShowUpgradeToast] = useState(false);
  const upgradeToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Cleanup polling and toast timeout on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (upgradeToastTimeoutRef.current) {
        clearTimeout(upgradeToastTimeoutRef.current);
      }
    };
  }, [user, searchParams]);

  const loadPlanInfo = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const plan = await getUserPlan(user.id);
      
      // Detect upgrade: Free -> Pro
      if (previousPlanRef.current && !previousPlanRef.current.isPro && plan?.isPro) {
        console.log('🎉 Detected upgrade from Free to Pro');
        setShowUpgradeToast(true);
        // Auto-hide toast after 5 seconds
        if (upgradeToastTimeoutRef.current) {
          clearTimeout(upgradeToastTimeoutRef.current);
        }
        upgradeToastTimeoutRef.current = setTimeout(() => {
          setShowUpgradeToast(false);
        }, 5000);
      }
      
      // Update previous plan reference
      if (plan) {
        previousPlanRef.current = { isPro: plan.isPro };
      }
      
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
    <div className="min-h-screen bg-surface-gradient">
      <div className="page-section">
        <div className="mx-auto max-w-[640px] px-4 sm:px-6 lg:px-8">
          <div className="card card-padding">
            <div className="text-center items-center space-y-1 mb-6">
              {user?.image && (
                <img
                  src={user.image}
                  alt={user.name}
                  className="h-24 w-24 rounded-full ring-2 ring-slate-200 mx-auto"
                />
              )}
              <p className="text-xl font-semibold text-gray-900">{user?.name}</p>
              <p className="text-slate-600 text-sm">{user?.email}</p>
            </div>

            <div className="space-y-6">

              {/* Current Plan */}
              <div>
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
                    
                    <div className="space-y-2 mb-2">
                      <p className="text-sm text-gray-700" role="status">
                        {planInfo.isPro 
                          ? 'You have full access to all Pro features.'
                          : 'Enjoy the free plan with basic search. Upgrade to Pro for full features.'
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
                          className="w-full btn-primary flex items-center justify-center"
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
                          className="w-full btn-primary flex items-center justify-center"
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
                                className="w-full btn-primary-sm flex items-center justify-center"
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
                              className="w-full btn-primary-sm flex items-center justify-center"
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

              {/* Search Preferences */}
              <div>
                <h3 className="mb-2">Search Preferences</h3>
                {canViewPrefs(planInfo) ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
                    <p className="text-sm text-gray-700">
                      {getPreferencesSummary(preferences) || 'No preferences saved yet.'}
                    </p>
                    <button
                      onClick={() => {
                        trackEvent("preferences_viewed", {
                          user_id: user?.id,
                          source: "profile_page"
                        });
                        router.push('/find');
                      }}
                      className="w-full btn-primary flex items-center justify-center gap-2"
                    >
                      <Edit className="w-5 h-5" aria-hidden="true" />
                      Edit Preferences
                    </button>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <Crown className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          Pro Feature
                        </p>
                        <p className="text-sm text-blue-700 mb-3">
                          Upgrade to Pro to save and view your search preferences. Your preferences are automatically saved as you search, and will be visible once you upgrade.
                        </p>
                        <button
                          onClick={() => {
                            trackEvent("pricing_cta_pro", {
                              source: "profile_page_preferences"
                            });
                            router.push('/pricing');
                          }}
                          className="w-full btn-primary-sm flex items-center justify-center gap-2"
                        >
                          <Crown className="w-4 h-4" aria-hidden="true" />
                          Upgrade to Pro
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Alerts - compact card */}
              <div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900" id="email-toggle-label">Email Notifications</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {!emailIsPro 
                          ? 'Pro users can get notified when new dogs match your preferences'
                          : 'Get notified when new dogs match your preferences'
                        }
                      </p>
                    </div>
                    <div 
                      className="relative"
                      onMouseEnter={() => {
                        if (!emailIsPro) {
                          setShowEmailTooltip(true);
                        }
                      }}
                      onMouseLeave={() => setShowEmailTooltip(false)}
                    >
                      <button
                        onClick={(e) => {
                          if (!emailIsPro) {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowEmailTooltip(true);
                            setTimeout(() => setShowEmailTooltip(false), 3000);
                            return;
                          }
                          toggleAlerts(!(settings?.enabled ?? false));
                        }}
                        disabled={emailLoading || !emailIsPro}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                          settings?.enabled ? 'bg-blue-600' : 'bg-gray-200'
                        } ${emailLoading || !emailIsPro ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'}`}
                        role="switch"
                        aria-checked={settings?.enabled}
                        aria-labelledby="email-toggle-label"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            settings?.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      {!emailIsPro && (
                        <div 
                          className={`absolute right-0 top-full mt-2 w-56 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] transition-opacity duration-200 ${
                            showEmailTooltip ? 'opacity-100 visible' : 'opacity-0 invisible'
                          }`}
                          style={{ pointerEvents: 'none' }}
                        >
                          Only Pro users have access to email notifications
                          <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {!emailIsPro 
                      ? 'Pro users can get notified when new dogs match your preferences. Email alerts are disabled. Enable to start receiving notifications about new dog matches.'
                      : settings?.enabled 
                        ? 'Email alerts are enabled. You\'ll receive notifications based on your preferences.'
                        : 'Email alerts are disabled. Enable to start receiving notifications about new dog matches.'
                    }
                  </p>
                </div>
              </div>

              {/* Search History removed per redesign */}

              {/* Sign Out */}
              <div>
                <button
                  onClick={signOut}
                  className="w-full btn-primary bg-red-600 hover:bg-red-700 focus-visible:ring-red-600 flex items-center justify-center"
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

      {/* Upgrade Toast Notification */}
      {showUpgradeToast && (
        <div 
          className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-5 duration-300"
          role="alert"
          aria-live="polite"
        >
          <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 mb-1">
                Welcome to Pro! 🎉
              </p>
              <p className="text-sm text-green-700">
                We restored your saved preferences from before you upgraded. Your preferences are now visible on this page and will auto-apply to your searches.
              </p>
            </div>
            <button
              onClick={() => {
                setShowUpgradeToast(false);
                if (upgradeToastTimeoutRef.current) {
                  clearTimeout(upgradeToastTimeoutRef.current);
                }
              }}
              className="text-green-400 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
              aria-label="Close notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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

function getPreferencesSummary(prefs: any | null | undefined) {
  if (!prefs) return '';

  const parts: string[] = [];

  if (Array.isArray(prefs.size_preferences) && prefs.size_preferences.length > 0) {
    parts.push(`dogs that are ${prefs.size_preferences.join(' to ')} sized`);
  }

  if (Array.isArray(prefs.age_preferences) && prefs.age_preferences.length > 0) {
    parts.push(`in the ${prefs.age_preferences.join(' or ')} age range`);
  }

  if (typeof prefs.energy_level === 'string' && prefs.energy_level) {
    parts.push(`${prefs.energy_level} energy`);
  }

  if (Array.isArray(prefs.temperament_traits) && prefs.temperament_traits.length > 0) {
    const traits = prefs.temperament_traits.slice(0, 3).join(', ');
    parts.push(`with temperament: ${traits}`);
  }

  if (Array.isArray(prefs.include_breeds) && prefs.include_breeds.length > 0) {
    const breeds = prefs.include_breeds.slice(0, 2).join(' or ');
    parts.push(`with a preference for ${breeds}`);
  }

  if (Array.isArray(prefs.zip_codes) && prefs.zip_codes.length > 0) {
    const zips = prefs.zip_codes.filter(Boolean);
    if (zips.length === 1) {
      parts.push(`located within 50 miles of ${zips[0]}`);
    } else if (zips.length === 2) {
      parts.push(`near ${zips[0]} and ${zips[1]}`);
    } else if (zips.length > 2) {
      parts.push(`near ${zips[0]}, ${zips[1]} and ${zips.length - 2} more`);
    }
  }

  const hasAny = (
    (Array.isArray(prefs.size_preferences) && prefs.size_preferences.length > 0) ||
    (Array.isArray(prefs.age_preferences) && prefs.age_preferences.length > 0) ||
    (Array.isArray(prefs.include_breeds) && prefs.include_breeds.length > 0) ||
    (Array.isArray(prefs.exclude_breeds) && prefs.exclude_breeds.length > 0) ||
    (Array.isArray(prefs.temperament_traits) && prefs.temperament_traits.length > 0) ||
    (typeof prefs.energy_level === 'string' && prefs.energy_level) ||
    (Array.isArray(prefs.zip_codes) && prefs.zip_codes.length > 0)
  );

  if (!hasAny) return '';

  const sentenceCore = parts.length > 0 ? parts.join(', ') : 'your saved criteria';
  return `Your current preferences allow you to find ${sentenceCore}.`;
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

