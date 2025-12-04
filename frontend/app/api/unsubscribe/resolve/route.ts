import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubToken } from '@/lib/tokens';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { getStripeServer } from '@/lib/stripe/config';
import { appConfig } from '@/lib/config';
import { okJson, errJson, ApiErrors } from '@/lib/api/helpers';

/**
 * GET /api/unsubscribe/resolve?token=<jwt>
 * Resolve token and return user info for unsubscribe page
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return errJson(ApiErrors.validationError('Missing token'), request);
    }

    if (!appConfig.emailTokenSecret) {
      return errJson(ApiErrors.internalError('Email token secret not configured'), request);
    }

    // Verify token
    let payload;
    try {
      payload = verifyUnsubToken(token);
    } catch (error: any) {
      const errorMessage = error?.message || '';
      if (errorMessage.includes('expired') || errorMessage === 'Token expired') {
        return errJson(ApiErrors.tokenExpired('This unsubscribe link has expired.'), request);
      }
      if (errorMessage.includes('Malformed') || errorMessage.includes('Bad signature')) {
        return errJson(ApiErrors.invalidToken('This unsubscribe link is invalid.'), request);
      }
      return errJson(ApiErrors.invalidToken('Invalid unsubscribe token.'), request);
    }

    // Accept both 'alerts+cancel' (legacy) and 'alerts+unsubscribe' (new)
    if (payload.scope !== 'alerts+cancel' && payload.scope !== 'alerts+unsubscribe') {
      return errJson(ApiErrors.forbidden('Invalid scope'), request);
    }

    const email = String(payload.sub);
    const client = getSupabaseClient();

    // Get user
    const { data: userRow, error: userErr } = await (client as any)
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    if (userErr || !userRow?.id) {
      return errJson(ApiErrors.notFound('User'), request);
    }

    const userId = userRow.id as string;

    // Get plan info
    const { data: planRow } = await (client as any)
      .from('plans')
      .select('plan_type, status, stripe_subscription_id, cancel_at_period_end, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    // Get alert settings
    const { data: alertRow } = await (client as any)
      .from('alert_settings')
      .select('enabled')
      .eq('user_id', userId)
      .maybeSingle();

    const isPro = planRow?.plan_type === 'pro';
    const hasActiveSubscription = isPro && planRow?.stripe_subscription_id;
    const cancelAtPeriodEnd = planRow?.cancel_at_period_end || false;
    const currentPeriodEnd = planRow?.current_period_end || null;
    const emailEnabled = alertRow?.enabled !== false; // Default true if not set

    // Determine plan status
    let planStatus: string;
    if (!isPro) {
      planStatus = 'free';
    } else if (cancelAtPeriodEnd) {
      planStatus = 'pro_pending_cancel';
    } else {
      planStatus = 'pro';
    }

    // If has active subscription, get period end from Stripe
    let periodEndDate: string | null = currentPeriodEnd;
    if (hasActiveSubscription && planRow.stripe_subscription_id) {
      try {
        const stripe = getStripeServer();
        const subscription = await stripe.subscriptions.retrieve(planRow.stripe_subscription_id);
        periodEndDate = (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : currentPeriodEnd;
      } catch (stripeError) {
        console.warn('Failed to fetch Stripe subscription:', stripeError);
        // Use DB value as fallback
      }
    }

    // Mask email for display
    const emailMasked = email.replace(/(.{2})(.*)(@.*)/, (_, start, middle, domain) => {
      return `${start}${'*'.repeat(Math.min(middle.length, 10))}${domain}`;
    });

    return okJson({
      user_id: userId,
      email_masked: emailMasked,
      plan_status: planStatus,
      current_period_end: periodEndDate,
      can_unsubscribe: true,
      cancel_at_period_end: cancelAtPeriodEnd,
      email_enabled: emailEnabled,
    }, request);
  } catch (error) {
    console.error('Unsubscribe resolve error:', error);
    return errJson(ApiErrors.internalError('Failed to resolve unsubscribe token'), request);
  }
}

