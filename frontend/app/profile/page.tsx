"use client";

import { useUser } from "@/lib/auth/user-context";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { PreferencesManager } from "@/components/PreferencesManager";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics/tracking";
import { UserPreferences } from "@/lib/hooks/use-preferences";

function ProfilePageContent() {
  const { user, signOut } = useUser();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'history'>('profile');

  useEffect(() => {
    trackEvent("profile_viewed", {
      authenticated: true,
      user_id: user?.id,
    });
  }, [user]);

  const handlePreferencesSaved = (preferences: UserPreferences) => {
    trackEvent("preferences_saved", {
      user_id: user?.id,
      has_preferences: !!preferences,
    });
    setActiveTab('profile'); // Switch back to profile tab after saving
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

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'profile', label: 'Profile' },
                  { id: 'preferences', label: 'Preferences' },
                  { id: 'history', label: 'Search History' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === 'profile' && (
                <>
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

                  <div className="border-t pt-6">
                    <button
                      onClick={signOut}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}

              {activeTab === 'preferences' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Dog Preferences
                    </h2>
                    <p className="text-sm text-gray-600">
                      Customize your search preferences to get better matches
                    </p>
                  </div>
                  <PreferencesManager
                    onSave={handlePreferencesSaved}
                  />
                </div>
              )}

              {activeTab === 'history' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Search History
                    </h2>
                    <p className="text-sm text-gray-600">
                      Your recent dog searches and results
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      🚧 Search history tracking coming soon in Module 4 completion.
                    </p>
                  </div>
                </div>
              )}
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

