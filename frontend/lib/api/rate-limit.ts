/**
 * Rate limiting middleware and utilities
 * Provides protection against abuse and ensures fair usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiError, getRequestId } from './response';

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

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, {
  count: number;
  resetTime: number;
}>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Default key generator (by IP address)
 */
function defaultKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return `rate_limit:${ip}`;
}

/**
 * User-based key generator (requires authentication)
 */
function userKeyGenerator(request: NextRequest): string {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    throw new Error('User ID required for user-based rate limiting');
  }
  return `rate_limit:user:${userId}`;
}

/**
 * API endpoint key generator (by endpoint and IP)
 */
function endpointKeyGenerator(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  const endpoint = new URL(request.url).pathname;
  return `rate_limit:${endpoint}:${ip}`;
}

/**
 * Create rate limit error
 */
function createRateLimitError(info: RateLimitInfo, message?: string): Error {
  const error = new Error(message || 'Rate limit exceeded') as any;
  error.code = 'RATE_LIMIT_EXCEEDED';
  error.statusCode = 429;
  error.retryAfter = info.retryAfter;
  error.limit = info.limit;
  error.remaining = info.remaining;
  return error;
}

/**
 * Check if request is within rate limit
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; info: RateLimitInfo; error?: Error } {
  const key = config.keyGenerator ? config.keyGenerator(request) : defaultKeyGenerator(request);
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check if within limit
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    const info: RateLimitInfo = {
      limit: config.maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
    
    return {
      allowed: false,
      info,
      error: createRateLimitError(info, config.message),
    };
  }
  
  // Increment counter
  entry.count++;
  
  const info: RateLimitInfo = {
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
  
  return { allowed: true, info };
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimit(config: RateLimitConfig) {
  return (request: NextRequest): NextResponse | null => {
    const { allowed, info, error } = checkRateLimit(request, config);
    
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
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', info.limit.toString());
      response.headers.set('X-RateLimit-Remaining', info.remaining.toString());
      response.headers.set('X-RateLimit-Reset', info.resetTime.toString());
      
      return response;
    }
    
    return null; // Allow request to continue
  };
}

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
  // Strict rate limit for authentication endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    keyGenerator: defaultKeyGenerator,
    message: 'Too many authentication attempts. Please try again later.',
  }),
  
  // Moderate rate limit for API endpoints
  api: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    keyGenerator: defaultKeyGenerator,
    message: 'Too many API requests. Please slow down.',
  }),
  
  // Strict rate limit for email operations
  email: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 email operations per minute
    keyGenerator: userKeyGenerator,
    message: 'Too many email operations. Please wait before trying again.',
  }),
  
  // Rate limit for search operations
  search: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per minute
    keyGenerator: userKeyGenerator,
    message: 'Too many search requests. Please slow down.',
  }),
  
  // Rate limit for webhook endpoints
  webhook: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 webhook calls per minute
    keyGenerator: endpointKeyGenerator,
    message: 'Too many webhook requests.',
  }),
  
  // Rate limit for admin operations
  admin: createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 admin operations per minute
    keyGenerator: userKeyGenerator,
    message: 'Too many admin operations. Please slow down.',
  }),
};

/**
 * Apply rate limiting to a request
 */
export function applyRateLimit(
  request: NextRequest,
  rateLimitType: keyof typeof RateLimits
): NextResponse | null {
  const rateLimit = RateLimits[rateLimitType];
  return rateLimit(request);
}

/**
 * Get rate limit info without applying the limit
 */
export function getRateLimitInfo(
  request: NextRequest,
  config: RateLimitConfig
): RateLimitInfo {
  const { info } = checkRateLimit(request, config);
  return info;
}
