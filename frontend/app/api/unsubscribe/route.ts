import { NextRequest, NextResponse } from 'next/server';
import { verifyUnsubToken } from '@/lib/tokens';
import { getSupabaseClient } from '@/lib/supabase-auth';
import { getStripeServer } from '@/lib/stripe/config';
import { appConfig } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const payload = verifyUnsubToken(token);
    if (payload.scope !== 'alerts+cancel') {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 403 });
    }

    const client = getSupabaseClient();
    // Example usage of config (ensures env loaded early)
    if (!appConfig.emailTokenSecret) throw new Error('EMAIL_TOKEN_SECRET not set');

    // Idempotency via jti recorded in email_events
    const jti = String(payload.jti || '');
    if (jti) {
      const { data: used } = await (client as any)
        .from('email_events')
        .select('id')
        .eq('message_id', jti)
        .maybeSingle?.() ?? await (client as any)
          .from('email_events')
          .select('id')
          .eq('message_id', jti)
          .single()
          .catch(() => ({ data: null }));
      if (used) return NextResponse.json({ ok: true, message: 'Already processed' });
    }

    const email = String(payload.sub);
    const { data: userRow, error: userErr } = await (client as any)
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    if (userErr || !userRow?.id) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const userId = userRow.id as string;

    // Disable alerts
    await (client as any)
      .from('alert_settings')
      .update({ enabled: false })
      .eq('user_id', userId);

    // Cancel subscription and downgrade
    const { data: planRow } = await (client as any)
      .from('plans')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .single();
    if (planRow?.stripe_subscription_id) {
      const stripe = getStripeServer();
      await stripe.subscriptions.cancel(planRow.stripe_subscription_id as string);
      await (client as any)
        .from('plans')
        .update({
          plan_type: 'free',
          status: 'cancelled',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    // Record event (and consume jti)
    await (client as any)
      .from('email_events')
      .insert({
        user_id: userId,
        event_type: 'unsubscribe_via_token',
        email_provider: 'internal',
        message_id: jti || null,
        metadata: { email },
      });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('unsubscribe error', e);
    return NextResponse.json({ error: e?.message || 'Unsubscribe failed' }, { status: 400 });
  }
}


