import { NextRequest, NextResponse } from 'next/server';

// Petfinder token cache
let pfToken: { accessToken: string; expiresAt: number } | null = null;
async function getPetfinderAccessToken(): Promise<string> {
  const now = Date.now();
  if (pfToken && pfToken.expiresAt - 60_000 > now) return pfToken.accessToken;
  const clientId = process.env.PETFINDER_CLIENT_ID;
  const clientSecret = process.env.PETFINDER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Petfinder credentials missing');
  const resp = await fetch('https://api.petfinder.com/v2/oauth2/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret })
  });
  if (!resp.ok) throw new Error('Failed to get Petfinder token');
  const data = await resp.json();
  pfToken = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return pfToken.accessToken;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const requestId = `dog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  try {
    const { id } = await params;
    
    if (!id) {
      const headers = new Headers();
      headers.set('X-Request-ID', requestId);
      headers.set('X-Route', '/api/dogs/[id]');
      return NextResponse.json(
        { error: 'Dog ID is required' },
        { status: 400, headers }
      );
    }

    // Build Petfinder URL for specific animal
    const pfUrl = `https://api.petfinder.com/v2/animals/${encodeURIComponent(id)}`;

    console.log(`[${requestId}] 🔄 Fetching dog from Petfinder:`, pfUrl);

    // Fetch with retry and timeouts
    let response: Response | null = null;
    let backendDuration = 0;
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const backendStart = Date.now();
      const timeoutMs = attempt === 1 ? 20000 : 35000; // 20s then 35s
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const token = await getPetfinderAccessToken();
        response = await fetch(pfUrl, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        backendDuration = Date.now() - backendStart;
        clearTimeout(timeoutId);
        if (response.status === 401 && attempt === 1) {
          pfToken = null; // refresh token and retry
          continue;
        }
        break;
      } catch (err) {
        backendDuration = Date.now() - backendStart;
        clearTimeout(timeoutId);
        console.warn(`[${requestId}] ⚠️ Dog fetch attempt ${attempt}/${maxRetries} failed after ${backendDuration}ms:`, (err as Error)?.message);
        if (attempt === maxRetries) throw err;
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }

    if (!response!.ok) {
      const totalDuration = Date.now() - startTime;
      console.error(`[${requestId}] ❌ Backend API error:`, response!.status, response!.statusText);
      const errHeaders = new Headers();
      errHeaders.set('X-Request-ID', requestId);
      errHeaders.set('X-Backend-Duration', `${backendDuration}`);
      errHeaders.set('X-Total-Duration', `${totalDuration}`);
      errHeaders.set('X-Route', '/api/dogs/[id]');
      const txt = await response!.text().catch(() => '');
      return NextResponse.json(
        { error: 'Petfinder API error', status: response!.status, details: txt.substring(0,120) },
        { status: response!.status, headers: errHeaders }
      );
    }

    const parseStart = Date.now();
    const data = await response!.json();
    const parseDuration = Date.now() - parseStart;
    const totalDuration = Date.now() - startTime;
    console.log(`[${requestId}] ✅ Backend API success, returning dog data`, {
      backendDuration: `${backendDuration}ms`,
      parseDuration: `${parseDuration}ms`,
      totalDuration: `${totalDuration}ms`,
    });
    const okHeaders = new Headers();
    okHeaders.set('X-Request-ID', requestId);
    okHeaders.set('X-Backend-Duration', `${backendDuration}`);
    okHeaders.set('X-Parse-Duration', `${parseDuration}`);
    okHeaders.set('X-Total-Duration', `${totalDuration}`);
    okHeaders.set('X-Route', '/api/dogs/[id]');
    
    return NextResponse.json(data, { headers: okHeaders });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Error proxying to backend after ${totalDuration}ms:`, error);
    const headers = new Headers();
    headers.set('X-Request-ID', requestId);
    headers.set('X-Backend-Duration', '0');
    headers.set('X-Total-Duration', `${totalDuration}`);
    headers.set('X-Route', '/api/dogs/[id]');
    return NextResponse.json(
      { error: 'Failed to fetch dog from backend', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers }
    );
  }
}
