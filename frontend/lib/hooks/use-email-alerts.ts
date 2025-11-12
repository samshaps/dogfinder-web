"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/auth/user-context';
import { EmailAlertPreferences } from '@/lib/email/types';

export interface EmailAlertSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  maxDogsPerEmail: number;
  minMatchScore: number;
  includePhotos: boolean;
  includeReasoning: boolean;
  lastSentAt?: string;
  lastSeenIds: string[];
  pausedUntil?: string;
}

export function useEmailAlerts() {
  const { user, isAuthenticated } = useUser();
  const [settings, setSettings] = useState<EmailAlertSettings | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withDefaults = useCallback(
    (partial: Partial<EmailAlertPreferences>): EmailAlertPreferences => {
      const fallback: EmailAlertSettings = settings ?? {
        enabled: false,
        frequency: 'daily',
        maxDogsPerEmail: 5,
        minMatchScore: 70,
        includePhotos: true,
        includeReasoning: true,
        lastSentAt: undefined,
        lastSeenIds: [],
      };

      return {
        enabled: partial.enabled ?? fallback.enabled ?? false,
        frequency: partial.frequency ?? fallback.frequency ?? 'daily',
        maxDogsPerEmail: partial.maxDogsPerEmail ?? fallback.maxDogsPerEmail ?? 5,
        minMatchScore: partial.minMatchScore ?? fallback.minMatchScore ?? 70,
        includePhotos: partial.includePhotos ?? fallback.includePhotos ?? true,
        includeReasoning: partial.includeReasoning ?? fallback.includeReasoning ?? true,
      };
    },
    [settings]
  );

  // Fetch email alert settings
  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/email-alerts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch email alert settings');
      }

      setSettings(data.settings);
      setIsPro(data.isPro ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching email alert settings:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Update email alert settings
  const updateSettings = useCallback(async (newSettings: Partial<EmailAlertPreferences>) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const payload = withDefaults(newSettings);
      const response = await fetch('/api/email-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update email alert settings');
      }

      setSettings(data.settings);
      return data.settings;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error updating email alert settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, withDefaults]);

  // Send test email
  const sendTestEmail = useCallback(async (testEmail: string) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/email-alerts?action=test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error sending test email:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Disable email alerts
  const disableAlerts = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/email-alerts', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable email alerts');
      }

      // Update local state
      if (settings) {
        setSettings({ ...settings, enabled: false });
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error disabling email alerts:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, settings]);

  // Toggle email alerts
  const toggleAlerts = useCallback(async (enabled: boolean) => {
    if (!isAuthenticated) return;

    return await updateSettings({ enabled });
  }, [isAuthenticated, updateSettings]);

  // Fetch settings when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSettings();
    } else {
      setSettings(null);
    }
  }, [isAuthenticated, user, fetchSettings]);

  return {
    settings,
    isPro,
    loading,
    error,
    fetchSettings,
    updateSettings,
    sendTestEmail,
    disableAlerts,
    toggleAlerts,
  };
}
