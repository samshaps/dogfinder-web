/**
 * Global error handling middleware and utilities
 * Provides consistent error handling across all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse, createApiError, ApiErrors, getRequestId } from './response';
import { ZodError } from 'zod';

export interface ErrorContext {
  requestId: string;
  url: string;
  method: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

/**
 * Log error with context for debugging
 */
function logError(error: Error, context: ErrorContext, additionalInfo?: any) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context,
    additionalInfo,
    timestamp: new Date().toISOString(),
  };

  // In production, you might want to send this to a logging service
  console.error('🚨 API Error:', JSON.stringify(errorInfo, null, 2));
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError) {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));

  return createApiError(
    'VALIDATION_ERROR',
    'Validation failed',
    400,
    { validationErrors: details }
  );
}

/**
 * Handle Stripe errors
 */
function handleStripeError(error: any) {
  const message = error.message || 'Stripe operation failed';
  const code = error.code || 'STRIPE_ERROR';
  
  return createApiError(
    'STRIPE_ERROR',
    message,
    400,
    { stripeCode: code, stripeType: error.type }
  );
}

/**
 * Handle Supabase errors
 */
function handleSupabaseError(error: any) {
  const message = error.message || 'Database operation failed';
  const code = error.code || 'DATABASE_ERROR';
  
  return createApiError(
    'DATABASE_ERROR',
    message,
    500,
    { supabaseCode: code, supabaseDetails: error.details }
  );
}

/**
 * Handle rate limiting errors
 */
function handleRateLimitError(error: any) {
  return createApiError(
    'RATE_LIMIT_EXCEEDED',
    error.message || 'Rate limit exceeded',
    429,
    { 
      retryAfter: error.retryAfter,
      limit: error.limit,
      remaining: error.remaining 
    }
  );
}

/**
 * Main error handler for API routes
 */
export function handleApiError(
  error: unknown,
  request: NextRequest,
  context?: Partial<ErrorContext>
): NextResponse {
  const requestId = getRequestId(request);
  const errorContext: ErrorContext = {
    requestId,
    url: request.url,
    method: request.method,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    ...context,
  };

  let apiError;

  // Handle different error types
  if (error instanceof ZodError) {
    apiError = handleZodError(error);
  } else if (error && typeof error === 'object' && 'code' in error) {
    const errorObj = error as any;
    // Stripe error
    if (errorObj.code && typeof errorObj.code === 'string' && errorObj.code.startsWith('stripe_')) {
      apiError = handleStripeError(errorObj);
    }
    // Supabase error
    else if (errorObj.code && typeof errorObj.code === 'string' && errorObj.code.startsWith('PGRST')) {
      apiError = handleSupabaseError(errorObj);
    }
    // Rate limit error
    else if (errorObj.code === 'RATE_LIMIT_EXCEEDED') {
      apiError = handleRateLimitError(errorObj);
    }
    // Generic API error
    else {
      apiError = createApiError(
        'INTERNAL_ERROR',
        errorObj.message || 'Unknown error',
        errorObj.statusCode || 500,
        errorObj.details
      );
    }
  } else if (error instanceof Error) {
    // Generic JavaScript error
    apiError = ApiErrors.internalError(error.message);
  } else {
    // Unknown error type
    apiError = ApiErrors.internalError('An unexpected error occurred');
  }

  // Log the error
  logError(error instanceof Error ? error : new Error(String(error)), errorContext);

  // Return standardized error response
  return NextResponse.json(
    createErrorResponse(apiError, { requestId }),
    { status: apiError.statusCode }
  );
}

/**
 * Async error wrapper for API route handlers
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      // Extract request from args (assuming it's the first argument)
      const request = args[0] as NextRequest;
      return handleApiError(error, request);
    }
  };
}

/**
 * Validation error handler for form submissions
 */
export function handleValidationError(
  errors: Array<{ field: string; message: string }>,
  request: NextRequest
): NextResponse {
  const requestId = getRequestId(request);
  
  const apiError = createApiError(
    'VALIDATION_ERROR',
    'Validation failed',
    400,
    { validationErrors: errors }
  );

  return NextResponse.json(
    createErrorResponse(apiError, { requestId }),
    { status: 400 }
  );
}

/**
 * Not found error handler
 */
export function handleNotFoundError(
  resource: string,
  request: NextRequest
): NextResponse {
  const requestId = getRequestId(request);
  
  const apiError = ApiErrors.notFound(resource);

  return NextResponse.json(
    createErrorResponse(apiError, { requestId }),
    { status: 404 }
  );
}

/**
 * Unauthorized error handler
 */
export function handleUnauthorizedError(
  message: string = 'Unauthorized',
  request: NextRequest
): NextResponse {
  const requestId = getRequestId(request);
  
  const apiError = ApiErrors.unauthorized(message);

  return NextResponse.json(
    createErrorResponse(apiError, { requestId }),
    { status: 401 }
  );
}

/**
 * Rate limit error handler
 */
export function handleRateLimitErrorResponse(
  message: string = 'Rate limit exceeded',
  retryAfter?: number,
  request?: NextRequest
): NextResponse {
  const requestId = request ? getRequestId(request) : `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  const apiError = createApiError(
    'RATE_LIMIT_EXCEEDED',
    message,
    429,
    { retryAfter }
  );

  const response = NextResponse.json(
    createErrorResponse(apiError, { requestId }),
    { status: 429 }
  );

  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}

// Re-export for convenience
export { generateRequestId } from './response';
