import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : null;
  const supabaseWs = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'wss://')
    : null;
  const umamiOrigin = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
    ? new URL(process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL).origin
    : null;

  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://js.stripe.com',
    'https://m.stripe.network',
    'https://vercel.live',
  ];

  const connectSrc = [
    "'self'",
    'https://api.stripe.com',
    'https://m.stripe.network',
    'https://r.stripe.com',
    'https://hooks.stripe.com',
    'https://api.resend.com',
    'https://api.openai.com',
    'https://api.petfinder.com',
    'https://cloud.umami.is',
    'https://vercel.live',
  ];

  if (supabaseOrigin) {
    scriptSrc.push(supabaseOrigin);
    connectSrc.push(supabaseOrigin);
  }
  if (supabaseWs) {
    connectSrc.push(supabaseWs);
  }
  if (umamiOrigin) {
    scriptSrc.push(umamiOrigin);
    connectSrc.push(umamiOrigin);
  }

  const contentSecurityPolicy = [
    `default-src 'self';`,
    `base-uri 'self';`,
    `form-action 'self' https://hooks.stripe.com;`,
    `frame-ancestors 'none';`,
    `frame-src https://js.stripe.com https://hooks.stripe.com;`,
    `img-src 'self' data: https:;`,
    `script-src ${Array.from(new Set(scriptSrc)).join(' ')};`,
    `style-src 'self' 'unsafe-inline';`,
    `font-src 'self' data:;`,
    `connect-src ${Array.from(new Set(connectSrc)).join(' ')};`,
    `worker-src 'self' blob:;`,
    `object-src 'none';`,
  ].join(' ');

  // Security headers
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': contentSecurityPolicy,
  };

  // Create response with security headers
  const response = NextResponse.next();
  
  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Log security events (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Middleware:', {
      method: request.method,
      url: request.url,
      pathname: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent')?.substring(0, 100)
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (auth pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
};
