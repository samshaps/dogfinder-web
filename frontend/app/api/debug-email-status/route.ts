/**
 * Debug endpoint to check email alert status for a user
 * Usage:
 *   GET /api/debug-email-status?email=user@example.com
 *   Headers: { "Authorization": "Bearer ADMIN_SECRET or CRON_SECRET" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { appConfig } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    // Simple auth check
    const authHeader = request.headers.get('authorization');
    const isProduction = process.env.VERCEL_ENV === 'production';
    const adminSecret = process.env.ADMIN_SECRET 
      || (isProduction ? appConfig.cronSecretProd : appConfig.cronSecretStaging);
    const isDev = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development';
    
    if (!isDev && (!authHeader || authHeader !== `Bearer ${adminSecret}`)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required. Use: ?email=user@example.com' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    
    // Get user
    const { data: userData, error: userError } = await client
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({
        email,
        found: false,
        error: userError?.message || 'User not found',
      });
    }

    const userId = (userData as any).id;

    // Get alert settings
    const { data: alertSettings, error: alertError } = await (client as any)
      .from('alert_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get preferences
    const { data: preferences, error: prefsError } = await (client as any)
      .from('preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Check if email was sent today
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    
    const alertSettingsData = alertSettings as any;
    const lastSent = alertSettingsData?.last_sent_at_utc 
      ? new Date(alertSettingsData.last_sent_at_utc)
      : null;
    
    const alreadySentToday = lastSent && lastSent >= todayStart;

    // Check if paused
    const pausedUntil = alertSettingsData?.paused_until 
      ? new Date(alertSettingsData.paused_until)
      : null;
    
    const isPaused = pausedUntil && pausedUntil > new Date();

    return NextResponse.json({
      email,
      found: true,
      user: {
        id: userId,
        name: (userData as any).name,
        email: (userData as any).email,
      },
      alertSettings: alertSettingsData ? {
        enabled: alertSettingsData.enabled,
        cadence: alertSettingsData.cadence,
        lastSentAt: alertSettingsData.last_sent_at_utc,
        lastSeenIds: alertSettingsData.last_seen_ids || [],
        pausedUntil: alertSettingsData.paused_until,
      } : null,
      alertSettingsError: alertError?.message,
      preferences: preferences ? {
        location: (preferences as any).location,
        zip_codes: (preferences as any).zip_codes,
        radius: (preferences as any).radius || (preferences as any).radius_mi,
        age_preferences: (preferences as any).age_preferences,
        size_preferences: (preferences as any).size_preferences,
        include_breeds: (preferences as any).include_breeds,
        energy_level: (preferences as any).energy_level,
      } : null,
      preferencesError: prefsError?.message,
      status: {
        hasAlertSettings: !!alertSettingsData,
        alertsEnabled: alertSettingsData?.enabled || false,
        hasPreferences: !!preferences,
        alreadySentToday,
        isPaused,
        wouldReceiveEmail: (alertSettingsData?.enabled && preferences && !alreadySentToday && !isPaused) || false,
        reason: !alertSettingsData?.enabled 
          ? 'Email alerts not enabled'
          : !preferences
          ? 'No preferences set'
          : alreadySentToday
          ? 'Email already sent today'
          : isPaused
          ? `Paused until ${pausedUntil?.toISOString()}`
          : 'Would receive email',
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Debug email status error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

