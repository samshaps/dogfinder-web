import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getStripeServer } from '@/lib/stripe/config';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { okJson, errJson, ApiErrors } from '@/lib/api/helpers';

/**
 * GET /api/stripe/downgrade-status
 * Check if user's subscription is scheduled for cancellation
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return errJson(ApiErrors.unauthorized('Authentication required'), request);
    }

    // Get user ID from email
    const client = getSupabaseClient();
    const { data: userData, error: userError } = await (client as any)
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return errJson(ApiErrors.notFound('User not found'), request);
    }

    const userId = (userData as any).id;

    // Get current plan and subscription
    const { data: planRow, error: planError } = await (client as any)
      .from('plans')
      .select('plan_type, stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    if (planError || !planRow || planRow.plan_type !== 'pro' || !planRow.stripe_subscription_id) {
      return okJson({
        isScheduledForCancellation: false,
        periodEnd: null,
      }, request);
    }

    // Check Stripe subscription status
    try {
      const stripe = getStripeServer();
      const subscription = await stripe.subscriptions.retrieve(
        planRow.stripe_subscription_id as string
      );

      const isScheduled = subscription.cancel_at_period_end || false;
      const periodEnd = isScheduled && (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null;

      return okJson({
        isScheduledForCancellation: isScheduled,
        periodEnd,
      }, request);

    } catch (stripeError: any) {
      // If subscription not found, it's not scheduled
      if (stripeError.code === 'resource_missing') {
        return okJson({
          isScheduledForCancellation: false,
          periodEnd: null,
        }, request);
      }

      throw stripeError;
    }

  } catch (error) {
    console.error('Error checking downgrade status:', error);
    return errJson(
      ApiErrors.internalError('An unexpected error occurred'),
      request
    );
  }
}

