import { NextRequest, NextResponse } from 'next/server';

// Backend API base URL - use environment variable or default to deployed backend
// Support staging backend URL via environment variable
const BACKEND_API_BASE = process.env.BACKEND_API_BASE || 
  (process.env.VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' 
    ? 'https://dogfinder-web-staging.onrender.com' 
    : 'https://dogfinder-web.onrender.com');

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Get the search params from the request
    const { searchParams } = new URL(request.url);
    const zipParam = searchParams.get('zip') || '';
    const coarseZip = zipParam.split(',')[0]?.slice(0, 3) || '';
    
    // Log request details
    const hasGuidance = searchParams.has('guidance');
    const guidanceLength = searchParams.get('guidance')?.length || 0;
    console.log(`[${requestId}] 🔄 /api/dogs called`, {
      hasGuidance,
      guidanceLength,
      params: Object.fromEntries(searchParams.entries()),
      zipCoarse: coarseZip,
      timestamp: new Date().toISOString()
    });
    
    // Build the backend URL with all query parameters (FOR NOW - we'll measure with guidance first)
    const backendUrl = new URL('/api/dogs', BACKEND_API_BASE);
    searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    console.log(`[${requestId}] 🔄 Proxying request to backend:`, backendUrl.toString());
    const backendStartTime = Date.now();

    // Forward the request to the backend with manual timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    let backendDuration = 0;
    let response: Response;
    try {
      response = await fetch(backendUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      backendDuration = Date.now() - backendStartTime;
      clearTimeout(timeoutId);
      console.log(`[${requestId}] ✅ Backend responded in ${backendDuration}ms (status: ${response.status})`);
    } catch (fetchError) {
      backendDuration = Date.now() - backendStartTime;
      clearTimeout(timeoutId);
      console.error(`[${requestId}] ❌ Backend fetch failed after ${backendDuration}ms:`, fetchError);
      throw fetchError;
    }

    if (!response.ok) {
      console.error(`[${requestId}] ❌ Backend API error:`, response.status, response.statusText);
      
      // Check if it's a rate limit error (429 from Petfinder) - check for 400 status
      if (response.status === 400) {
        try {
          const errorText = await response.text();
          console.log(`[${requestId}] 📄 Backend error response:`, errorText);
          
          // Parse the JSON and check for rate limit
          if (errorText) {
            const errorData = JSON.parse(errorText);
            if (errorData.detail && errorData.detail.includes('429 Client Error: Too Many Requests')) {
              console.log(`[${requestId}] 🚫 Rate limit detected, returning 429`);
              const errorHeaders = new Headers();
              const totalDuration429 = Date.now() - startTime;
              errorHeaders.set('X-Request-ID', requestId);
              errorHeaders.set('X-Backend-Duration', `${backendDuration}`);
              errorHeaders.set('X-Total-Duration', `${totalDuration429}`);
              errorHeaders.set('X-Route', '/api/dogs');
              return NextResponse.json(
                { 
                  error: 'RATE_LIMIT_EXCEEDED',
                  message: 'We\'ve been hugged to death! Please try again in a few minutes.',
                  redirectTo: '/rate-limit'
                },
                { status: 429, headers: errorHeaders }
              );
            }
          }
        } catch (e) {
          console.error(`[${requestId}] ❌ Error parsing backend response:`, e);
        }
      }
      
      const totalDuration = Date.now() - startTime;
      console.log(`[${requestId}] ⏱️ /api/dogs total duration: ${totalDuration}ms (backend: ${backendDuration}ms)`);
      const errorHeaders = new Headers();
      errorHeaders.set('X-Request-ID', requestId);
      errorHeaders.set('X-Backend-Duration', `${backendDuration}`);
      errorHeaders.set('X-Total-Duration', `${totalDuration}`);
      errorHeaders.set('X-Route', '/api/dogs');
      return NextResponse.json(
        { error: 'Backend API error', status: response.status },
        { status: response.status, headers: errorHeaders }
      );
    }

    const parseStartTime = Date.now();
    const data = await response.json();
    const parseDuration = Date.now() - parseStartTime;
    const totalDuration = Date.now() - startTime;
    
    console.log(`[${requestId}] ✅ Backend API success`, {
      totalDuration: `${totalDuration}ms`,
      backendDuration: `${backendDuration}ms`,
      parseDuration: `${parseDuration}ms`,
      dogCount: data.items?.length || 0,
      hasGuidance,
      zipCoarse: coarseZip
    });
    
    // Add performance headers
    const responseHeaders = new Headers();
    responseHeaders.set('X-Request-ID', requestId);
    responseHeaders.set('X-Backend-Duration', `${backendDuration}`);
    responseHeaders.set('X-Total-Duration', `${totalDuration}`);
    responseHeaders.set('X-Parse-Duration', `${parseDuration}`);
    responseHeaders.set('X-Route', '/api/dogs');
    
    return NextResponse.json(data, { headers: responseHeaders });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Error proxying to backend after ${totalDuration}ms:`, error);
    
    // Handle timeout/abort specifically
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      console.error(`[${requestId}] ⏱️ TIMEOUT - Request exceeded 15s limit (actual: ${totalDuration}ms)`);
      const timeoutHeaders = new Headers();
      timeoutHeaders.set('X-Request-ID', requestId);
      timeoutHeaders.set('X-Backend-Duration', '0');
      timeoutHeaders.set('X-Total-Duration', `${totalDuration}`);
      timeoutHeaders.set('X-Route', '/api/dogs');
      return NextResponse.json(
        { 
          error: 'Backend timeout', 
          message: 'The backend API is taking too long to respond. Please try again later.',
          details: `Backend API timeout after ${totalDuration}ms`
        },
        { status: 504, headers: timeoutHeaders }
      );
    }
    
    const errorHeaders = new Headers();
    errorHeaders.set('X-Request-ID', requestId);
    errorHeaders.set('X-Backend-Duration', '0');
    errorHeaders.set('X-Total-Duration', `${totalDuration}`);
    errorHeaders.set('X-Route', '/api/dogs');
    return NextResponse.json(
      { error: 'Failed to fetch dogs from backend', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: errorHeaders }
    );
  }
}
