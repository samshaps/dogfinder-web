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
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string; messageId?: string; resendDashboardUrl?: string } | null>(null);

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
      const response = await sendTestEmail(testEmail.trim());
      setTestEmailResult({ 
        success: true, 
        message: 'Test email sent successfully!',
        messageId: (response as any)?.resendMessageId || (response as any)?.messageId,
        resendDashboardUrl: (response as any)?.resendDashboardUrl,
      });
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
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`} role="status" aria-live="polite">
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading email settings...</span>
          </div>
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
          <div className="flex items-start gap-2">
            {testEmailResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={testEmailResult.success ? 'text-green-700' : 'text-red-700'}>
                {testEmailResult.message}
              </p>
              {testEmailResult.success && (
                <div className="mt-2 text-sm text-green-600">
                  {testEmailResult.messageId && (
                    <div className="mb-2 p-2 bg-green-50 rounded border border-green-200">
                      <p className="text-xs text-green-600 mb-1"><strong>Resend Message ID:</strong> {testEmailResult.messageId}</p>
                      {testEmailResult.resendDashboardUrl && (
                        <a 
                          href={testEmailResult.resendDashboardUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View in Resend Dashboard →
                        </a>
                      )}
                    </div>
                  )}
                  <p className="font-medium mb-1">Not seeing the email?</p>
                  <ul className="list-disc list-inside space-y-1 text-green-700">
                    <li>Check your spam/junk folder</li>
                    <li>Resend marks as "Delivered" when it reaches your mail server, but may still be filtered</li>
                    <li>Check the Resend dashboard link above for detailed delivery status</li>
                    <li>Verify your domain is configured in Resend dashboard</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.enabled ? (
              <Bell className="w-5 h-5 text-green-600" aria-hidden="true" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" aria-hidden="true" />
            )}
            <div>
              <h3 className="text-lg font-medium text-gray-900" id="email-notifications-label">
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
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
              settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'}`}
            role="switch"
            aria-checked={settings.enabled}
            aria-labelledby="email-notifications-label"
            aria-describedby="email-notifications-description"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p id="email-notifications-description" className="text-xs text-gray-500 mt-2 ml-8">
          {settings.enabled 
            ? 'Email alerts are enabled. You\'ll receive notifications based on your preferences below.'
            : 'Email alerts are disabled. Enable to start receiving notifications about new dog matches.'
          }
        </p>
      </div>

      {/* Settings Panel */}
      {settings.enabled && (
        <div className="space-y-6 border-t border-gray-200 pt-6" role="region" aria-labelledby="settings-panel-title">
          <h4 id="settings-panel-title" className="text-lg font-medium text-gray-900 mb-4">
            Alert Preferences
          </h4>
          
          {/* Frequency Setting */}
          <div>
            <label htmlFor="alert-frequency" className="block text-sm font-medium text-gray-700 mb-2">
              Alert Frequency
            </label>
            <select
              id="alert-frequency"
              value={settings.frequency}
              onChange={(e) => handleUpdateSettings({ frequency: e.target.value })}
              disabled={loading}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-describedby="frequency-description"
            >
              <option value="daily">Daily - Check every day at 12pm Eastern</option>
              <option value="weekly">Weekly - Check every Monday at 12pm Eastern</option>
            </select>
            <p id="frequency-description" className="mt-1 text-sm text-gray-500">
              How often to check for new matches and send email alerts
            </p>
          </div>

          {/* Max Dogs Per Email */}
          <div>
            <label htmlFor="max-dogs-per-email" className="block text-sm font-medium text-gray-700 mb-2">
              Max Dogs Per Email
            </label>
            <select
              id="max-dogs-per-email"
              value={settings.maxDogsPerEmail}
              onChange={(e) => handleUpdateSettings({ maxDogsPerEmail: parseInt(e.target.value) })}
              disabled={loading}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-describedby="max-dogs-description"
            >
              <option value={3}>3 dogs - Quick overview</option>
              <option value={5}>5 dogs - Balanced selection</option>
              <option value={10}>10 dogs - Comprehensive list</option>
            </select>
            <p id="max-dogs-description" className="mt-1 text-sm text-gray-500">
              Maximum number of dogs to include in each email alert
            </p>
          </div>

          {/* Min Match Score */}
          <div>
            <label htmlFor="min-match-score" className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Match Score
            </label>
            <select
              id="min-match-score"
              value={settings.minMatchScore}
              onChange={(e) => handleUpdateSettings({ minMatchScore: parseInt(e.target.value) })}
              disabled={loading}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-describedby="match-score-description"
            >
              <option value={50}>50% - Show more matches (broader selection)</option>
              <option value={70}>70% - Good matches (recommended)</option>
              <option value={85}>85% - Great matches only (high quality)</option>
            </select>
            <p id="match-score-description" className="mt-1 text-sm text-gray-500">
              Only send alerts for dogs above this match score percentage
            </p>
          </div>

          {/* Content Options */}
          <div className="space-y-6">
            <h4 className="text-sm font-medium text-gray-700">Email Content Options</h4>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label htmlFor="include-photos-toggle" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Include Photos
                </label>
                <p className="text-xs text-gray-500 mt-1">Show dog photos in email alerts for better visual appeal</p>
              </div>
              <button
                id="include-photos-toggle"
                onClick={() => handleUpdateSettings({ includePhotos: !settings.includePhotos })}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                  settings.includePhotos ? 'bg-blue-600' : 'bg-gray-200'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'}`}
                role="switch"
                aria-checked={settings.includePhotos}
                aria-describedby="photos-description"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    settings.includePhotos ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label htmlFor="include-reasoning-toggle" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Include AI Reasoning
                </label>
                <p className="text-xs text-gray-500 mt-1">Show why each dog is a good match based on your preferences</p>
              </div>
              <button
                id="include-reasoning-toggle"
                onClick={() => handleUpdateSettings({ includeReasoning: !settings.includeReasoning })}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
                  settings.includeReasoning ? 'bg-blue-600' : 'bg-gray-200'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'}`}
                role="switch"
                aria-checked={settings.includeReasoning}
                aria-describedby="reasoning-description"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    settings.includeReasoning ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Test Email */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <TestTube className="w-5 h-5 text-gray-600" aria-hidden="true" />
              <h4 className="text-sm font-medium text-gray-700">Test Email</h4>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Send a test email to verify your settings are working correctly
            </p>
            
            {!showTestEmail ? (
              <button
                onClick={() => setShowTestEmail(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                aria-describedby="test-email-description"
              >
                <TestTube className="w-4 h-4" aria-hidden="true" />
                Send Test Email
              </button>
            ) : (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <label htmlFor="test-email-input" className="block text-sm font-medium text-gray-700 mb-2">
                    Test Email Address
                  </label>
                  <input
                    id="test-email-input"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email address to test"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    aria-describedby="test-email-help"
                  />
                  <p id="test-email-help" className="mt-1 text-xs text-gray-500">
                    We'll send a test email with your current settings
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSendTestEmail}
                    disabled={testEmailLoading || !testEmail.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {testEmailLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" aria-hidden="true" />
                        <span>Send Test</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowTestEmail(false);
                      setTestEmail('');
                      setTestEmailResult(null);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Info */}
          {settings.lastSentAt && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Settings className="w-5 h-5 text-gray-600" aria-hidden="true" />
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-gray-700 mb-1">Alert Status</h5>
                  <p className="text-sm text-gray-600">
                    Last alert sent: <span className="font-medium">{new Date(settings.lastSentAt).toLocaleDateString()}</span>
                  </p>
                  {settings.lastSeenIds.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Currently tracking {settings.lastSeenIds.length} dogs you've already seen
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

