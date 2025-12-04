import { NextRequest, NextResponse } from 'next/server';
import { getActiveDogProvider } from '@/lib/dogProviders';

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

    console.log(`[${requestId}] 🔄 Fetching dog from provider`, { id });

    // Fetch with retry and timeouts
    const provider = getActiveDogProvider();
    let backendDuration = 0;
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const backendStart = Date.now();
      const timeoutMs = attempt === 1 ? 20000 : 35000; // 20s then 35s
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const dogPromise = provider.getDogById(id);
        const timeoutPromise = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('TimeoutError')), timeoutMs)
        );

        const dog = await Promise.race([dogPromise, timeoutPromise]);
        backendDuration = Date.now() - backendStart;
        clearTimeout(timeoutId);

        if (!dog) {
          if (attempt === maxRetries) {
            const headers = new Headers();
            headers.set('X-Request-ID', requestId);
            headers.set('X-Backend-Duration', `${backendDuration}`);
            headers.set('X-Route', '/api/dogs/[id]');
            return NextResponse.json(
              { error: 'Dog not found' },
              { status: 404, headers }
            );
          }
        } else {
          const totalDuration = Date.now() - startTime;
          console.log(`[${requestId}] ✅ Provider success, returning dog data`, {
            backendDuration: `${backendDuration}ms`,
            totalDuration: `${totalDuration}ms`,
          });
          const okHeaders = new Headers();
          okHeaders.set('X-Request-ID', requestId);
          okHeaders.set('X-Backend-Duration', `${backendDuration}`);
          okHeaders.set('X-Total-Duration', `${totalDuration}`);
          okHeaders.set('X-Route', '/api/dogs/[id]');
          
          return NextResponse.json(dog, { headers: okHeaders });
        }
      } catch (err) {
        backendDuration = Date.now() - backendStart;
        clearTimeout(timeoutId);
        console.warn(`[${requestId}] ⚠️ Dog fetch attempt ${attempt}/${maxRetries} failed after ${backendDuration}ms:`, (err as Error)?.message);
        if (attempt === maxRetries) throw err;
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }

    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Provider failed after retries`, { backendDuration, totalDuration });
    const errHeaders = new Headers();
    errHeaders.set('X-Request-ID', requestId);
    errHeaders.set('X-Backend-Duration', `${backendDuration}`);
    errHeaders.set('X-Total-Duration', `${totalDuration}`);
    errHeaders.set('X-Route', '/api/dogs/[id]');
    return NextResponse.json(
      { error: 'Failed to fetch dog from provider' },
      { status: 500, headers: errHeaders }
    );
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
