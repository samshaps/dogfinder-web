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
      const response = await fetch('/api/email-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
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
  }, [isAuthenticated]);

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

    const newSettings = { enabled };
    
    // If enabling, set some default values
    if (enabled && settings) {
      (newSettings as any).frequency = (settings as any).frequency || 'daily';
      (newSettings as any).maxDogsPerEmail = (settings as any).maxDogsPerEmail || 5;
      (newSettings as any).minMatchScore = (settings as any).minMatchScore || 70;
      (newSettings as any).includePhotos = (settings as any).includePhotos ?? true;
      (newSettings as any).includeReasoning = (settings as any).includeReasoning ?? true;
    }

    return await updateSettings(newSettings);
  }, [isAuthenticated, settings, updateSettings]);

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
