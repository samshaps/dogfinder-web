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


