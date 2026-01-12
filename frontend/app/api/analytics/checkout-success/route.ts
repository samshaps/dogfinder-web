import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { getUserPlan } from '@/lib/stripe/plan-utils';

export const dynamic = 'force-dynamic';

/**
 * Backend endpoint to verify and track Stripe checkout completion
 * 
 * This endpoint:
 * 1. Verifies user is authenticated
 * 2. Verifies user has completed checkout (has Pro plan)
 * 3. Returns success for client to track the event
 * 
 * Called when user returns from Stripe checkout with upgrade=success param
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user from database
    const client = getSupabaseClient();
    const { data: userData, error: userError } = await (client as any)
      .from('users')
      .select('id, email')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      console.error('❌ User not found:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify user has completed checkout (has Pro plan)
    const planInfo = await getUserPlan(userData.id);
    const isPro = planInfo?.isPro === true || planInfo?.planType === 'PRO';

    if (!isPro) {
      // User hasn't actually completed checkout yet
      return NextResponse.json(
        { error: 'Checkout not completed', verified: false },
        { status: 400 }
      );
    }

    // Checkout verified - return success
    // Client will track the event to Umami
    return NextResponse.json({
      success: true,
      verified: true,
      plan: planInfo?.planType || 'pro',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Error verifying checkout success:', error);
    return NextResponse.json(
      { 
        error: 'Failed to verify checkout',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

