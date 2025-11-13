import crypto from 'crypto';

const ALG = 'sha256';

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function signUnsubToken(
  payload: Record<string, any>,
  secret = process.env.EMAIL_TOKEN_SECRET!,
  ttlSeconds = 7 * 24 * 3600
) {
  if (!secret) throw new Error('EMAIL_TOKEN_SECRET not set');
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + ttlSeconds, ...payload };

  const encHeader = b64url(JSON.stringify(header));
  const encBody = b64url(JSON.stringify(body));
  const unsigned = `${encHeader}.${encBody}`;
  const sig = crypto.createHmac(ALG, secret).update(unsigned).digest();
  return `${unsigned}.${b64url(sig)}`;
}

export function verifyUnsubToken(token: string, secret = process.env.EMAIL_TOKEN_SECRET!) {
  if (!secret) throw new Error('EMAIL_TOKEN_SECRET not set');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [h, b, s] = parts;
  const expected = crypto.createHmac(ALG, secret).update(`${h}.${b}`).digest();
  const sig = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (expected.length !== sig.length || !crypto.timingSafeEqual(expected, sig)) {
    throw new Error('Bad signature');
  }
  const payload = JSON.parse(Buffer.from(b.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  if (typeof payload.exp === 'number' && Math.floor(Date.now() / 1000) > payload.exp) throw new Error('Token expired');
  return payload;
}

/**
 * Check if a token jti (JWT ID) has already been consumed
 * This prevents token reuse attacks
 */
export async function consumeTokenJti(jti: string): Promise<{ alreadyUsed: boolean; success: boolean }> {
  if (!jti) {
    return { alreadyUsed: false, success: false };
  }

  try {
    const { getSupabaseClient } = await import('@/lib/supabase-auth');
    const client = getSupabaseClient();

    // Check if this jti has already been used
    const { data: existingEvent, error: checkError } = await (client as any)
      .from('email_events')
      .select('id')
      .eq('message_id', jti)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('❌ Error checking token jti:', checkError);
      return { alreadyUsed: false, success: false };
    }

    if (existingEvent) {
      console.log(`⚠️ Token jti ${jti} has already been used`);
      return { alreadyUsed: true, success: true };
    }

    // Mark as consumed by creating an event record
    // The actual event details will be filled in by the caller
    return { alreadyUsed: false, success: true };
  } catch (error) {
    console.error('❌ Error consuming token jti:', error);
    return { alreadyUsed: false, success: false };
  }
}

/**
 * Record a token jti as consumed in the email_events table
 * This should be called after successfully processing a token
 */
export async function recordTokenJtiConsumed(
  jti: string,
  userId: string,
  eventType: string = 'token_consumed'
): Promise<void> {
  if (!jti) return;

  try {
    const { getSupabaseClient } = await import('@/lib/supabase-auth');
    const client = getSupabaseClient();

    // Insert event record to mark jti as consumed
    const { error } = await (client as any)
      .from('email_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        email_provider: 'internal',
        message_id: jti,
        metadata: { consumed_at: new Date().toISOString() },
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('❌ Failed to record token jti consumption:', error);
      // Don't throw - this is best-effort idempotency tracking
    }
  } catch (error) {
    console.error('❌ Error recording token jti:', error);
    // Don't throw - this is best-effort
  }
}


