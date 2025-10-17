import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getSupabaseClient } from '@/lib/supabase';
import { EmailAlertPreferencesSchema } from '@/lib/email/types';
import { getStripeServer } from '@/lib/stripe/config';
import { sendTestEmail } from '@/lib/email/service';

// GET /api/email-alerts - Get user's email alert settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const client = getSupabaseClient();
    
    // Get user ID
    const { data: userData, error: userError } = await client
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = (userData as any).id;

    // Get alert settings
    const { data: alertSettings, error: alertError } = await client
      .from('alert_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (alertError && alertError.code !== 'PGRST116') {
      console.error('Error fetching alert settings:', alertError);
      return NextResponse.json(
        { error: 'Failed to fetch alert settings' },
        { status: 500 }
      );
    }

    // Return default settings if none exist
    const settings = alertSettings || {
      enabled: false,
      cadence: 'daily',
      last_sent_at_utc: null,
      last_seen_ids: [],
      paused_until: null,
    };

    return NextResponse.json({
      settings: {
        enabled: settings.enabled,
        frequency: settings.cadence,
        maxDogsPerEmail: 5, // Default value
        minMatchScore: 70, // Default value
        includePhotos: true, // Default value
        includeReasoning: true, // Default value
        lastSentAt: settings.last_sent_at_utc,
        lastSeenIds: settings.last_seen_ids || [],
        pausedUntil: settings.paused_until,
      }
    });

  } catch (error) {
    console.error('Error fetching email alert settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email alert settings' },
      { status: 500 }
    );
  }
}

// POST /api/email-alerts - Update user's email alert settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // Handle test email action
    if (action === 'test') {
      const { testEmail } = body;
      
      if (!testEmail) {
        return NextResponse.json(
          { error: 'Test email address is required' },
          { status: 400 }
        );
      }

      const result = await sendTestEmail(testEmail, session.user.email);
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to send test email' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Test email sent successfully',
        messageId: result.messageId,
      });
    }

    // Validate the request body
    const validatedData = EmailAlertPreferencesSchema.parse(body);

    const client = getSupabaseClient();
    
    // Get user ID
    const { data: userData, error: userError } = await client
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = (userData as any).id;

    // Prepare alert settings data for database
    const alertSettingsData = {
      user_id: userId,
      enabled: validatedData.enabled,
      cadence: validatedData.frequency,
      last_sent_at_utc: null, // Reset when settings change
      last_seen_ids: [], // Reset when settings change
      paused_until: null, // Reset when settings change
    };

    // Upsert alert settings
    const { data, error } = await (client as any)
      .from('alert_settings')
      .upsert(alertSettingsData, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving alert settings:', error);
      return NextResponse.json(
        { error: 'Failed to save alert settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Email alert settings saved successfully',
      settings: {
        enabled: (data as any).enabled,
        frequency: (data as any).cadence,
        maxDogsPerEmail: validatedData.maxDogsPerEmail,
        minMatchScore: validatedData.minMatchScore,
        includePhotos: validatedData.includePhotos,
        includeReasoning: validatedData.includeReasoning,
        lastSentAt: (data as any).last_sent_at_utc,
        lastSeenIds: (data as any).last_seen_ids || [],
        pausedUntil: (data as any).paused_until,
      }
    });

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid email alert settings', details: error.message },
        { status: 400 }
      );
    }

    console.error('Error saving email alert settings:', error);
    return NextResponse.json(
      { error: 'Failed to save email alert settings' },
      { status: 500 }
    );
  }
}

// DELETE /api/email-alerts - Disable email alerts for user
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const client = getSupabaseClient();
    
    // Get user ID
    const { data: userData, error: userError } = await client
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = (userData as any).id;

    // Disable alerts by setting enabled to false
    const { data, error } = await (client as any)
      .from('alert_settings')
      .update({ enabled: false })
      .eq('user_id', userId)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error disabling alert settings:', error);
      return NextResponse.json(
        { error: 'Failed to disable email alerts' },
        { status: 500 }
      );
    }

    // Also cancel subscription and downgrade plan to FREE
    try {
      // Read current plan
      const { data: planRow, error: planErr } = await (client as any)
        .from('plans')
        .select('stripe_subscription_id, status')
        .eq('user_id', userId)
        .single();

      if (!planErr && planRow?.stripe_subscription_id) {
        const stripe = getStripeServer();
        // Cancel immediately
        await stripe.subscriptions.cancel(planRow.stripe_subscription_id as string);

        // Downgrade locally
        const { error: updErr } = await (client as any)
          .from('plans')
          .update({
            plan_type: 'free',
            status: 'cancelled',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updErr) {
          console.error('Plan downgrade update failed:', updErr);
        }
      }
    } catch (e) {
      console.error('Subscription cancellation failed (continuing):', e);
    }

    return NextResponse.json({
      message: 'Email alerts disabled and plan downgraded to Free'
    });

  } catch (error) {
    console.error('Error disabling email alerts:', error);
    return NextResponse.json(
      { error: 'Failed to disable email alerts' },
      { status: 500 }
    );
  }
}
