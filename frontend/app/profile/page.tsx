"use client";

import { useUser } from "@/lib/auth/user-context";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics/tracking";
import { useRouter } from "next/navigation";
import { Edit, Crown, Star } from "lucide-react";
import { getUserPlan } from "@/lib/stripe/plan-utils";
import { PLANS } from "@/lib/stripe/config";

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
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  {planInfo?.isPro ? (
                    <Crown className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <Star className="w-5 h-5 text-blue-500" />
                  )}
                  Current Plan
                </h2>
                
                {loading ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600">Loading plan information...</p>
                  </div>
                ) : planInfo ? (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-semibold text-blue-900">
                        {PLANS[planInfo.planType as keyof typeof PLANS]?.name || 'Free'} Plan
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        planInfo.isPro 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {planInfo.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {planInfo.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-blue-800">{feature}</span>
                        </div>
                      ))}
                      {planInfo.features.length > 3 && (
                        <p className="text-sm text-blue-600">
                          +{planInfo.features.length - 3} more features
                        </p>
                      )}
                    </div>
                    
                    {!planInfo.isPro && (
                      <button
                        onClick={() => {
                          trackEvent('profile_upgrade_clicked', {
                            user_id: user?.id,
                            source: 'profile_page'
                          });
                          router.push('/pricing');
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                      >
                        Upgrade to Pro
                      </button>
                    )}

                    {planInfo.isPro && (
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/stripe/create-portal-session', { method: 'POST' });
                            const data = await res.json();
                            if (data?.url) window.location.href = data.url;
                          } catch (e) {
                            alert('Failed to open billing portal. Please try again.');
                          }
                        }}
                        className="w-full bg-white border border-blue-600 text-blue-600 font-semibold py-2 px-4 rounded-lg transition-colors text-sm hover:bg-blue-50"
                      >
                        Manage Billing
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600">Unable to load plan information</p>
                  </div>
                )}
              </div>

              {/* Edit Preferences Button */}
              <div className="border-t pt-6">
                <button
                  onClick={() => {
                    trackEvent("preferences_viewed", {
                      user_id: user?.id,
                      source: "profile_page"
                    });
                    router.push('/find');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-5 h-5" />
                  Edit My Search Preferences
                </button>
                <p className="text-sm text-gray-500 text-center mt-2">
                  Update your saved search criteria on the Find page
                </p>
              </div>

              {/* Search History Section */}
              <div className="border-t pt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Search History
                </h2>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    🚧 Search history tracking coming soon in Module 4 completion.
                  </p>
                </div>
              </div>

              {/* Sign Out */}
              <div className="border-t pt-6">
                <button
                  onClick={signOut}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
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

