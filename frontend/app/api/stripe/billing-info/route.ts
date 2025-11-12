import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getStripeServer } from '@/lib/stripe/config';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { okJson, errJson, ApiErrors } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/stripe/billing-info
 * Get comprehensive billing information for the current user
 * Returns billing dates, subscription status, and whether user downgraded from Pro
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      const response = errJson(ApiErrors.unauthorized('Authentication required'), request);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    // Get user ID from email
    const client = getSupabaseClient();
    const { data: userData, error: userError } = await (client as any)
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      const response = errJson(ApiErrors.notFound('User not found'), request);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    const userId = (userData as any).id;

    // Get current plan
    const { data: planRow, error: planError } = await (client as any)
      .from('plans')
      .select('plan_type, status, stripe_subscription_id, current_period_end')
      .eq('user_id', userId)
      .single();

    if (planError) {
      // If no plan found, user is on free (never had Pro)
      const response = okJson({
        planType: 'free',
        hasActiveSubscription: false,
        isScheduledForCancellation: false,
        nextBillingDate: null,
        wasDowngradedFromPro: false,
      }, request);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    const planType = planRow.plan_type || 'free';
    const hasActiveSubscription = !!planRow.stripe_subscription_id;

    // If user is on Free and has no subscription, they never had Pro
    if (planType === 'free' && !hasActiveSubscription) {
      const response = okJson({
        planType: 'free',
        hasActiveSubscription: false,
        isScheduledForCancellation: false,
        nextBillingDate: null,
        wasDowngradedFromPro: false,
      }, request);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    // If user has a subscription, check Stripe for details
    if (hasActiveSubscription) {
      try {
        const stripe = getStripeServer();
        const subscription = await stripe.subscriptions.retrieve(
          planRow.stripe_subscription_id as string
        );

        const isScheduled = subscription.cancel_at_period_end || false;
        const periodEnd = (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : null;

        // If user is on Pro and subscription is active (not scheduled to cancel)
        if (planType === 'pro' && !isScheduled) {
          const response = okJson({
            planType: 'pro',
            hasActiveSubscription: true,
            isScheduledForCancellation: false,
            nextBillingDate: periodEnd,
            wasDowngradedFromPro: false,
          }, request);
          response.headers.set('Cache-Control', 'no-store');
          return response;
        }

        // If user is on Pro and subscription is scheduled to cancel
        if (planType === 'pro' && isScheduled) {
          const response = okJson({
            planType: 'pro',
            hasActiveSubscription: true,
            isScheduledForCancellation: true,
            nextBillingDate: periodEnd, // This is when they'll lose Pro access
            finalBillingDate: periodEnd,
            wasDowngradedFromPro: false, // Still on Pro, just scheduled to cancel
          }, request);
          response.headers.set('Cache-Control', 'no-store');
          return response;
        }

        // If user is on Free but has an active subscription (edge case - shouldn't happen)
        if (planType === 'free' && !isScheduled) {
          const response = okJson({
            planType: 'free',
            hasActiveSubscription: true,
            isScheduledForCancellation: false,
            nextBillingDate: periodEnd,
            wasDowngradedFromPro: true, // Had subscription, now on free
          }, request);
          response.headers.set('Cache-Control', 'no-store');
          return response;
        }

        // If user is on Free with scheduled cancellation
        if (planType === 'free' && isScheduled) {
          const response = okJson({
            planType: 'free',
            hasActiveSubscription: true,
            isScheduledForCancellation: true,
            nextBillingDate: periodEnd,
            finalBillingDate: periodEnd,
            wasDowngradedFromPro: true,
          }, request);
          response.headers.set('Cache-Control', 'no-store');
          return response;
        }

      } catch (stripeError: any) {
        // If subscription not found in Stripe, check if we have period end in DB
        if (stripeError.code === 'resource_missing') {
          // User had Pro but subscription is gone - they're on free now (downgraded)
          const dbPeriodEnd = planRow.current_period_end;
          const response = okJson({
            planType: 'free',
            hasActiveSubscription: false,
            isScheduledForCancellation: false,
            nextBillingDate: null,
            wasDowngradedFromPro: dbPeriodEnd ? true : false, // If we have period_end in DB, they likely had Pro
          }, request);
          response.headers.set('Cache-Control', 'no-store');
          return response;
        }

        throw stripeError;
      }
    }

    // Fallback: Free user (no subscription)
    const response = okJson({
      planType: 'free',
      hasActiveSubscription: false,
      isScheduledForCancellation: false,
      nextBillingDate: null,
      wasDowngradedFromPro: planRow.current_period_end ? true : false,
    }, request);
    response.headers.set('Cache-Control', 'no-store');
    return response;

  } catch (error) {
    console.error('Error fetching billing info:', error);
    const response = errJson(
      ApiErrors.internalError('An unexpected error occurred'),
      request
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
