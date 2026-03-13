/**
 * Rate limiting middleware and utilities
 * Provides protection against abuse and ensures fair usage
 *
 * Backed by Upstash Redis (shared across all serverless instances).
 * Fails open if the store is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getRequestId } from './response';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// ---------------------------------------------------------------------------
// Upstash Redis + Ratelimit instance helpers (lazy, cached)
// ---------------------------------------------------------------------------

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!_redis) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}

// Convert windowMs to an Upstash duration string
function msToDuration(ms: number): `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}` {
  if (ms < 1_000) return `${ms} ms`;
  if (ms < 60_000) return `${Math.round(ms / 1_000)} s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} m`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)} h`;
  return `${Math.round(ms / 86_400_000)} d`;
}

const _ratelimitCache = new Map<string, Ratelimit>();

function getRatelimit(config: RateLimitConfig): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${config.maxRequests}:${config.windowMs}`;
  if (!_ratelimitCache.has(cacheKey)) {
    _ratelimitCache.set(
      cacheKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.maxRequests, msToDuration(config.windowMs)),
        prefix: 'rl',
      })
    );
  }
  return _ratelimitCache.get(cacheKey)!;
}

// ---------------------------------------------------------------------------
// Key generators
// ---------------------------------------------------------------------------

function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return `rate_limit:${ip}`;
}

function userKeyGenerator(request: NextRequest): string {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    throw new Error('User ID required for user-based rate limiting');
  }
  return `rate_limit:user:${userId}`;
}

function endpointKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  const endpoint = new URL(request.url).pathname;
  return `rate_limit:${endpoint}:${ip}`;
}

// ---------------------------------------------------------------------------
// Core check — async due to Upstash network call
// ---------------------------------------------------------------------------

export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ allowed: boolean; info: RateLimitInfo; error?: Error }> {
  const key = config.keyGenerator ? config.keyGenerator(request) : defaultKeyGenerator(request);
  const ratelimit = getRatelimit(config);

  // Fail open if store is not configured
  if (!ratelimit) {
    console.warn('[rate-limit] Upstash Redis not configured — failing open');
    return {
      allowed: true,
      info: { limit: config.maxRequests, remaining: config.maxRequests, resetTime: Date.now() + config.windowMs },
    };
  }

  try {
    const result = await ratelimit.limit(key);
    const now = Date.now();
    const info: RateLimitInfo = {
      limit: result.limit,
      remaining: result.remaining,
      resetTime: result.reset,
      retryAfter: result.success ? undefined : Math.ceil((result.reset - now) / 1000),
    };

    if (!result.success) {
      const error = new Error(config.message || 'Rate limit exceeded') as Error & {
        code: string;
        statusCode: number;
        retryAfter?: number;
      };
      error.code = 'RATE_LIMIT_EXCEEDED';
      error.statusCode = 429;
      error.retryAfter = info.retryAfter;
      return { allowed: false, info, error };
    }

    return { allowed: true, info };
  } catch (err) {
    // Fail open on store errors
    console.warn('[rate-limit] Store error — failing open:', err);
    return {
      allowed: true,
      info: { limit: config.maxRequests, remaining: config.maxRequests, resetTime: Date.now() + config.windowMs },
    };
  }
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

export function createRateLimit(config: RateLimitConfig) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const { allowed, info, error } = await checkRateLimit(request, config);

    if (!allowed && error) {
      const requestId = getRequestId(request);

      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: error.message,
            details: {
              limit: info.limit,
              remaining: info.remaining,
              resetTime: new Date(info.resetTime).toISOString(),
              retryAfter: info.retryAfter,
            },
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        },
        { status: 429 }
      );

      if (info.retryAfter) {
        response.headers.set('Retry-After', info.retryAfter.toString());
      }
      response.headers.set('X-RateLimit-Limit', info.limit.toString());
      response.headers.set('X-RateLimit-Remaining', info.remaining.toString());
      response.headers.set('X-RateLimit-Reset', info.resetTime.toString());

      return response;
    }

    return null; // Allow request to continue
  };
}

// ---------------------------------------------------------------------------
// Predefined rate limit configurations
// ---------------------------------------------------------------------------

export const RateLimits = {
  // Strict rate limit for authentication endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: defaultKeyGenerator,
    message: 'Too many authentication attempts. Please try again later.',
  }),

  // Moderate rate limit for API endpoints
  api: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyGenerator: defaultKeyGenerator,
    message: 'Too many API requests. Please slow down.',
  }),

  // Strict rate limit for email operations
  email: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3,
    keyGenerator: userKeyGenerator,
    message: 'Too many email operations. Please wait before trying again.',
  }),

  // Rate limit for search operations
  search: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    keyGenerator: userKeyGenerator,
    message: 'Too many search requests. Please slow down.',
  }),

  // Rate limit for webhook endpoints
  webhook: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: endpointKeyGenerator,
    message: 'Too many webhook requests.',
  }),

  // Rate limit for admin operations
  admin: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: userKeyGenerator,
    message: 'Too many admin operations. Please slow down.',
  }),
};

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export async function applyRateLimit(
  request: NextRequest,
  rateLimitType: keyof typeof RateLimits
): Promise<NextResponse | null> {
  const rateLimit = RateLimits[rateLimitType];
  return rateLimit(request);
}

export async function getRateLimitInfo(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitInfo> {
  const { info } = await checkRateLimit(request, config);
  return info;
}
