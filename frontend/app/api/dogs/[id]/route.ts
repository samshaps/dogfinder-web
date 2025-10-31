import { NextRequest, NextResponse } from 'next/server';

// Backend API base URL - use environment variable or default to deployed backend
const BACKEND_API_BASE = process.env.BACKEND_API_BASE || 'https://dogfinder-web.onrender.com';

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

    // Build the backend URL for the specific dog
    const backendUrl = `${BACKEND_API_BASE}/api/dogs/${id}`;

    console.log(`[${requestId}] 🔄 Proxying dog request to backend:`, backendUrl);

    // Forward the request to the backend
    const backendStart = Date.now();
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
    const backendDuration = Date.now() - backendStart;

    if (!response.ok) {
      const totalDuration = Date.now() - startTime;
      console.error(`[${requestId}] ❌ Backend API error:`, response.status, response.statusText);
      const errHeaders = new Headers();
      errHeaders.set('X-Request-ID', requestId);
      errHeaders.set('X-Backend-Duration', `${backendDuration}`);
      errHeaders.set('X-Total-Duration', `${totalDuration}`);
      errHeaders.set('X-Route', '/api/dogs/[id]');
      return NextResponse.json(
        { error: 'Backend API error', status: response.status },
        { status: response.status, headers: errHeaders }
      );
    }

    const parseStart = Date.now();
    const data = await response.json();
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
