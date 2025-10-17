"use client";

import { useUser } from "@/lib/auth/user-context";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics/tracking";
import { useRouter } from "next/navigation";
import { Edit, Crown, Star, AlertCircle } from "lucide-react";
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

function ProfilePageContent() {
  const { user, signOut } = useUser();
  const router = useRouter();
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackEvent("profile_viewed", {
      authenticated: true,
      user_id: user?.id,
    });

    if (user?.id) {
      loadPlanInfo();
    }
  }, [user]);

  const loadPlanInfo = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const plan = await getUserPlan(user.id);
      setPlanInfo(plan);
    } catch (error) {
      console.error('Error loading plan info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              {user?.image && (
                <img
                  src={user.image}
                  alt={user.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4"
                />
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome, {user?.name}!
              </h1>
              <p className="text-gray-600">{user?.email}</p>
            </div>

            <div className="space-y-6">
              {/* Account Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2" id="plan-section">
                  {planInfo?.isPro ? (
                    <Crown className="w-5 h-5 text-yellow-500" aria-hidden="true" />
                  ) : (
                    <Star className="w-5 h-5 text-blue-500" aria-hidden="true" />
                  )}
                  Current Plan
                </h2>
                
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
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                            PREMIUM
                          </span>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        planInfo.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : planInfo.status === 'trialing'
                          ? 'bg-blue-100 text-blue-800'
                          : planInfo.status === 'past_due'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {planInfo.status === 'active' ? 'Active' : 
                         planInfo.status === 'trialing' ? 'Trial' :
                         planInfo.status === 'past_due' ? 'Payment Issue' :
                         planInfo.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600 mb-3">
                        {planInfo.isPro 
                          ? 'You have access to all Pro features including email alerts and unlimited searches.'
                          : 'Upgrade to Pro for email alerts, unlimited searches, and premium features.'
                        }
                      </p>
                      {planInfo.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                      {planInfo.features.length > 3 && (
                        <p className="text-sm text-gray-500 ml-6">
                          +{planInfo.features.length - 3} more features available
                        </p>
                      )}
                    </div>
                    
                    {!planInfo.isPro && (
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            trackEvent('profile_upgrade_clicked', {
                              user_id: user?.id,
                              source: 'profile_page'
                            });
                            router.push('/pricing');
                          }}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          aria-describedby="upgrade-description"
                        >
                          <span className="flex items-center justify-center gap-2">
                            <Crown className="w-4 h-4" aria-hidden="true" />
                            Upgrade to Pro
                          </span>
                        </button>
                        <p id="upgrade-description" className="text-xs text-gray-500 text-center">
                          Get email alerts, unlimited searches, and premium features
                        </p>
                      </div>
                    )}
                    
                    {planInfo.isPro && planInfo.status === 'trialing' && (
                      <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium">
                          🎉 You're in your free trial! Enjoy all Pro features.
                        </p>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Search Preferences</h3>
                <button
                  onClick={() => {
                    trackEvent("preferences_viewed", {
                      user_id: user?.id,
                      source: "profile_page"
                    });
                    router.push('/find');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4" id="search-history-section">
                  Search History
                </h2>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Search History Coming Soon</h3>
                  <p className="text-gray-600 text-sm mb-4">
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
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageContent />
    </ProtectedRoute>
  );
}

