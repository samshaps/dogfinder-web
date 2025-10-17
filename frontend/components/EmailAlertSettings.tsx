"use client";

import { useState } from 'react';
import { useEmailAlerts } from '@/lib/hooks/use-email-alerts';
import { Mail, Bell, BellOff, Settings, TestTube, CheckCircle, AlertCircle } from 'lucide-react';

interface EmailAlertSettingsProps {
  className?: string;
}

export default function EmailAlertSettings({ className = '' }: EmailAlertSettingsProps) {
  const {
    settings,
    loading,
    error,
    updateSettings,
    sendTestEmail,
    toggleAlerts,
  } = useEmailAlerts();

  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleToggleAlerts = async (enabled: boolean) => {
    try {
      await toggleAlerts(enabled);
    } catch (error) {
      console.error('Failed to toggle alerts:', error);
    }
  };

  const handleUpdateSettings = async (updates: any) => {
    try {
      await updateSettings(updates);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) return;

    setTestEmailLoading(true);
    setTestEmailResult(null);

    try {
      await sendTestEmail(testEmail.trim());
      setTestEmailResult({ success: true, message: 'Test email sent successfully!' });
      setTestEmail('');
      setShowTestEmail(false);
    } catch (error) {
      setTestEmailResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send test email' 
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  if (!settings) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Email Alerts</h2>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {testEmailResult && (
        <div className={`mb-6 p-4 rounded-lg ${
          testEmailResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {testEmailResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <p className={testEmailResult.success ? 'text-green-700' : 'text-red-700'}>
              {testEmailResult.message}
            </p>
          </div>
        </div>
      )}

      {/* Main Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.enabled ? (
              <Bell className="w-5 h-5 text-green-600" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Email Notifications
              </h3>
              <p className="text-sm text-gray-600">
                Get notified when new dogs match your preferences
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggleAlerts(!settings.enabled)}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {settings.enabled && (
        <div className="space-y-6 border-t border-gray-200 pt-6">
          {/* Frequency Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alert Frequency
            </label>
            <select
              value={settings.frequency}
              onChange={(e) => handleUpdateSettings({ frequency: e.target.value })}
              disabled={loading}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              How often to check for new matches
            </p>
          </div>

          {/* Max Dogs Per Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Dogs Per Email
            </label>
            <select
              value={settings.maxDogsPerEmail}
              onChange={(e) => handleUpdateSettings({ maxDogsPerEmail: parseInt(e.target.value) })}
              disabled={loading}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value={3}>3 dogs</option>
              <option value={5}>5 dogs</option>
              <option value={10}>10 dogs</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Maximum number of dogs to include in each email
            </p>
          </div>

          {/* Min Match Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Match Score
            </label>
            <select
              value={settings.minMatchScore}
              onChange={(e) => handleUpdateSettings({ minMatchScore: parseInt(e.target.value) })}
              disabled={loading}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value={50}>50% - Show more matches</option>
              <option value={70}>70% - Good matches</option>
              <option value={85}>85% - Great matches only</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Only send alerts for dogs above this match score
            </p>
          </div>

          {/* Content Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Email Content</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-gray-700">Include Photos</label>
                <p className="text-xs text-gray-500">Show dog photos in emails</p>
              </div>
              <button
                onClick={() => handleUpdateSettings({ includePhotos: !settings.includePhotos })}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.includePhotos ? 'bg-blue-600' : 'bg-gray-200'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.includePhotos ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-gray-700">Include AI Reasoning</label>
                <p className="text-xs text-gray-500">Show why each dog is a good match</p>
              </div>
              <button
                onClick={() => handleUpdateSettings({ includeReasoning: !settings.includeReasoning })}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.includeReasoning ? 'bg-blue-600' : 'bg-gray-200'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.includeReasoning ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Test Email */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <TestTube className="w-5 h-5 text-gray-600" />
              <h4 className="text-sm font-medium text-gray-700">Test Email</h4>
            </div>
            
            {!showTestEmail ? (
              <button
                onClick={() => setShowTestEmail(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <TestTube className="w-4 h-4" />
                Send Test Email
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Email Address
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email address to test"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSendTestEmail}
                    disabled={testEmailLoading || !testEmail.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testEmailLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Test
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowTestEmail(false);
                      setTestEmail('');
                      setTestEmailResult(null);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Info */}
          {settings.lastSentAt && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-700">
                    Last alert sent: {new Date(settings.lastSentAt).toLocaleDateString()}
                  </p>
                  {settings.lastSeenIds.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Tracking {settings.lastSeenIds.length} seen dogs
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

