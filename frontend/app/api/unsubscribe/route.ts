import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubToken, consumeTokenJti, recordTokenJtiConsumed } from '@/lib/tokens';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { getStripeServer } from '@/lib/stripe/config';
import { setPlan } from '@/lib/stripe/plan-sync';
import { appConfig } from '@/lib/config';
import { okJson, errJson, ApiErrors } from '@/lib/api/helpers';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token) {
      return errJson(ApiErrors.validationError('Missing token'), req);
    }

    if (!appConfig.emailTokenSecret) {
      throw new Error('EMAIL_TOKEN_SECRET not set');
    }

    // Verify token and handle token-specific errors
    let payload;
    try {
      payload = verifyUnsubToken(token);
    } catch (error: any) {
      const errorMessage = error?.message || '';
      // Token expired
      if (errorMessage.includes('expired') || errorMessage === 'Token expired') {
        return errJson(ApiErrors.tokenExpired('This unsubscribe link has expired. Please request a new one from your email settings or contact support.'), req);
      }
      // Invalid/malformed token
      if (errorMessage.includes('Malformed') || errorMessage.includes('Bad signature') || errorMessage === 'Malformed token' || errorMessage === 'Bad signature') {
        return errJson(ApiErrors.invalidToken('This unsubscribe link is invalid or has been tampered with. Please request a new one from your email settings.'), req);
      }
      // Generic token error
      return errJson(ApiErrors.invalidToken('Invalid unsubscribe token. Please request a new link from your email settings.'), req);
    }

    // Accept both 'alerts+cancel' (legacy) and 'alerts+unsubscribe' (new)
    if (payload.scope !== 'alerts+cancel' && payload.scope !== 'alerts+unsubscribe') {
      return errJson(ApiErrors.forbidden('Invalid scope'), req);
    }

    // Check if token jti has already been consumed (idempotency)
    const jti = String(payload.jti || '');
    if (jti) {
      const { alreadyUsed } = await consumeTokenJti(jti);
      if (alreadyUsed) {
        // Token has already been used - return a clear message
        return errJson(ApiErrors.validationError('This unsubscribe link has already been used. Your subscription is already cancelled. If you need help, please contact support.'), req);
      }
    }

    const email = String(payload.sub);
    const client = getSupabaseClient();
    const { data: userRow, error: userErr } = await (client as any)
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userErr || !userRow?.id) {
      return errJson(ApiErrors.notFound('User'), req);
    }
    const userId = userRow.id as string;

    // Disable email alerts immediately
    await (client as any)
      .from('alert_settings')
      .update({ enabled: false })
      .eq('user_id', userId);

    // Get plan info to check subscription status
    const { data: planRow } = await (client as any)
      .from('plans')
      .select('stripe_subscription_id, plan_type, cancel_at_period_end, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    let planStatus = 'free';
    let currentPeriodEnd: string | null = null;

    // If user has an active Pro subscription, schedule cancellation at period end
    if (planRow?.stripe_subscription_id && planRow?.plan_type === 'pro') {
      const stripe = getStripeServer();
      
      try {
        // Update Stripe subscription to cancel at period end
        const subscription = await stripe.subscriptions.update(planRow.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
        
        // Update database with cancel_at_period_end and current_period_end
        currentPeriodEnd = (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : planRow.current_period_end;
        
        await (client as any)
          .from('plans')
          .update({
            cancel_at_period_end: true,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        
        planStatus = 'pro_pending_cancel';
        
      } catch (stripeError: any) {
        console.error('❌ Failed to update Stripe subscription:', stripeError);
        // If Stripe update fails, still mark as cancelled in DB
        // But don't throw - we've already disabled alerts
      }
    }

    // Record event and mark jti as consumed
    await recordTokenJtiConsumed(jti, userId, 'unsubscribe_via_token');

    return okJson({ 
      plan_status: planStatus,
      current_period_end: currentPeriodEnd,
      email_enabled: false,
    }, req);
  } catch (e: any) {
    console.error('unsubscribe error', e);
    const error = ApiErrors.validationError(e?.message || 'Unsubscribe failed');
    error.statusCode = 400;
    return errJson(error, req);
  }
}


