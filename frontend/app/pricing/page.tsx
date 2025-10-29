'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/lib/auth/user-context';
import { getUserPlan } from '@/lib/stripe/plan-utils';
import { PLANS } from '@/lib/stripe/config';
import { trackEvent } from '@/lib/analytics/tracking';

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

export default function PricingPage() {
  const { user } = useUser();
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [downgrading, setDowngrading] = useState(false);

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

  const loadPlanInfo = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const plan = await getUserPlan(user.id);
      setPlanInfo(plan);

      // Load billing information
      try {
        const billingResponse = await fetch('/api/stripe/billing-info');
        if (billingResponse.ok) {
          const billingData = await billingResponse.json();
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
      // Redirect to sign in with callback URL to return to pricing
      window.location.href = '/auth/signin?callbackUrl=' + encodeURIComponent('/pricing');
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
    if (!user) return;

    try {
      setDowngrading(true);
      trackEvent('pricing_downgrade_initiated', {
        user_id: user.id,
        source: 'pricing_page'
      });

      const response = await fetch('/api/stripe/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to downgrade plan');
      }

      // Reload plan info to reflect changes
      await loadPlanInfo();
      
      // Redirect to profile to see the downgrade confirmation
      window.location.href = '/profile';
    } catch (error: any) {
      console.error('Error downgrading:', error);
      alert(error.message || 'Failed to downgrade plan. Please try again or contact support.');
    } finally {
      setDowngrading(false);
    }
  };

  const currentPlan = planInfo?.planType || 'FREE';
  const isPro = planInfo?.isPro || false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Never Miss Your Perfect Pup Again!
          </h1>
          <p className="text-xl text-gray-600 mb-12">
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

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            {/* Free Plan */}
            <div className={`bg-white rounded-2xl shadow-lg p-8 border-2 ${isPro ? 'border-gray-200' : 'border-green-500'} relative`}>
              {!isPro && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Current Plan
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Free Plan</h3>
                <div className="text-4xl font-bold mb-4">
                  $0<span className="text-lg text-gray-500">/month</span>
                </div>
                <p className="text-gray-600">Perfect for getting started and finding your ideal dog</p>
              </div>
              
              <ul className="space-y-4 mb-8 text-left">
                {PLANS.FREE.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={isPro ? handleDowngrade : undefined}
                disabled={!isPro || downgrading}
                className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors ${
                  isPro 
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-100 text-gray-800 cursor-not-allowed'
                } ${downgrading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {downgrading ? 'Processing...' : isPro ? 'Downgrade to Free' : 'Current Plan'}
              </button>
            </div>

            {/* Pro Plan */}
            <div className={`bg-blue-600 text-white rounded-2xl shadow-xl p-8 border-2 border-blue-700 relative ${isPro ? 'border-green-500' : ''}`}>
              {!isPro && (
                <div className="absolute top-0 right-8 -mt-4 bg-yellow-400 text-blue-900 px-4 py-1 rounded-full text-sm font-bold">
                  POPULAR
                </div>
              )}
              {isPro && (
                <div className="absolute top-0 right-8 -mt-4 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                  ACTIVE
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Pro Plan</h3>
                <div className="text-4xl font-bold mb-4">
                  $9.99<span className="text-lg opacity-80">/month</span>
                </div>
                <p className="opacity-90">Unlock advanced features for a truly personalized experience</p>
              </div>
              
              <ul className="space-y-4 mb-8 text-left">
                {PLANS.PRO.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-6 h-6 text-yellow-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={handleUpgrade}
                disabled={upgrading || (isPro && !billingInfo?.isScheduledForCancellation)}
                className={`w-full font-semibold py-3 px-6 rounded-lg transition-colors ${
                  isPro && !billingInfo?.isScheduledForCancellation
                    ? 'bg-green-500 text-white cursor-not-allowed' 
                    : upgrading 
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-white text-blue-600 hover:bg-gray-100'
                }`}
              >
                {upgrading 
                  ? 'Processing...' 
                  : isPro && !billingInfo?.isScheduledForCancellation
                    ? 'Active Plan' 
                    : billingInfo?.isScheduledForCancellation
                      ? 'Re-subscribe to Pro'
                      : billingInfo?.wasDowngradedFromPro
                        ? 'Re-subscribe to Pro'
                        : 'Upgrade to Pro'
                }
              </button>
              
              {billingInfo?.isScheduledForCancellation && billingInfo.finalBillingDate && (
                <p className="text-xs text-white/80 mt-2">
                  Plan expires on {new Date(billingInfo.finalBillingDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Why DogYenta Email Alerts Section */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold mb-12">Why DogYenta Email Alerts?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-bold mb-2">Perfect Matches</h3>
                <p className="text-gray-600">
                  Our advanced algorithm connects you with dogs that meet your exact criteria
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold mb-2">Instant Alerts</h3>
                <p className="text-gray-600">
                  Be the first to know about new dogs that match your preferences
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
                <p className="text-gray-600">
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

