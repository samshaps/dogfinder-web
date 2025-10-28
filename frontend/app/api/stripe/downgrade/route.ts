import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getStripeServer } from '@/lib/stripe/config';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { setPlan } from '@/lib/stripe/plan-sync';
import { okJson, errJson, ApiErrors } from '@/lib/api/helpers';

/**
 * POST /api/stripe/downgrade
 * Downgrades user from Pro to Free plan
 * Cancels Stripe subscription at period end
 */
export async function POST(request: NextRequest) {
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
    const stripe = getStripeServer();

    // Get current plan and subscription
    const { data: planRow, error: planError } = await (client as any)
      .from('plans')
      .select('plan_type, status, stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    if (planError) {
      console.error('Error fetching plan:', planError);
      return errJson(
        ApiErrors.notFound('Plan not found'),
        request
      );
    }

    // Verify user is on Pro plan
    if (planRow.plan_type !== 'pro') {
      return errJson(
        ApiErrors.validationError('You are not on a Pro plan'),
        request
      );
    }

    // Check if already cancelled
    if (!planRow.stripe_subscription_id) {
      // Already downgraded or no active subscription
      await setPlan({
        userId,
        planType: 'free',
        status: 'active',
        stripeSubscriptionId: null,
      });
      
      return okJson({
        message: 'Already on Free plan',
        periodEnd: null,
      }, request);
    }

    // Cancel subscription at period end (not immediately)
    try {
      const subscription = await stripe.subscriptions.retrieve(
        planRow.stripe_subscription_id as string
      );

      // Check if already scheduled for cancellation
      if (subscription.cancel_at_period_end) {
        // Already scheduled, just return the end date
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        return okJson({
          message: 'Downgrade already scheduled',
          periodEnd,
        }, request);
      }

      // Schedule cancellation at period end
      const updatedSubscription = await stripe.subscriptions.update(
        planRow.stripe_subscription_id as string,
        {
          cancel_at_period_end: true,
        }
      );

      const periodEnd = updatedSubscription.current_period_end
        ? new Date(updatedSubscription.current_period_end * 1000).toISOString()
        : null;

      // Update plan status to reflect cancellation is scheduled
      // Keep plan_type as 'pro' until period end, but mark status appropriately
      // Note: We don't change plan_type to 'free' yet - that happens when webhook fires
      await (client as any)
        .from('plans')
        .update({
          status: 'active', // Still active until period end
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      // Log the downgrade action
      console.log(`✅ Downgrade scheduled for user ${userId}:`, {
        subscriptionId: updatedSubscription.id,
        periodEnd,
      });

      return okJson({
        message: 'Downgrade scheduled successfully',
        periodEnd,
      }, request);

    } catch (stripeError: any) {
      console.error('Stripe API error:', stripeError);
      
      // If subscription not found in Stripe, just update local plan
      if (stripeError.code === 'resource_missing') {
        console.warn('Subscription not found in Stripe, downgrading locally');
        await setPlan({
          userId,
          planType: 'free',
          status: 'active',
          stripeSubscriptionId: null,
        });

        return okJson({
          message: 'Downgraded to Free plan',
          periodEnd: null,
        }, request);
      }

      return errJson(
        ApiErrors.serverError('Failed to cancel subscription'),
        request
      );
    }

  } catch (error) {
    console.error('Error in downgrade endpoint:', error);
    return errJson(
      ApiErrors.serverError('An unexpected error occurred'),
      request
    );
  }
}

