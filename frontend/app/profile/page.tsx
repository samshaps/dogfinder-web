"use client";

import { useUser } from "@/lib/auth/user-context";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/tracking";

function ProfilePageContent() {
  const { user, signOut } = useUser();

  useEffect(() => {
    trackEvent("profile_viewed", {
      authenticated: true,
      user_id: user?.id,
    });
  }, [user]);

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
              <div className="border-t pt-6">
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Preferences
                </h2>
                <p className="text-gray-600 mb-4">
                  Your dog preferences and search history will appear here.
                </p>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    🚧 Coming soon: Save your preferences, view search history, and manage your alerts.
                  </p>
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

