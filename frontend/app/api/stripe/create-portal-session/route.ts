import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getSupabaseClient } from 'lib/supabase-auth';
import { getStripeServer } from 'lib/stripe/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const client = getSupabaseClient();

    // Find user id
    const { data: userRow, error: userErr } = await (client as any)
      .from('users')
      .select('id, email, name')
      .eq('email', session.user.email)
      .single();
    if (userErr || !userRow?.id) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = (userRow as any).id as string;

    // Get or create stripe customer id from plans
    const { data: planRow } = await (client as any)
      .from('plans')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    const stripe = getStripeServer();
    let stripeCustomerId: string | null = planRow?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name ?? undefined,
        metadata: { user_id: userId },
      });
      stripeCustomerId = customer.id;
      // Persist for future portal access
      await (client as any)
        .from('plans')
        .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }

    const returnUrl = `${request.nextUrl.origin}/profile`;
    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId as string,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err: any) {
    console.error('Error creating billing portal session', err);
    return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
  }
}


