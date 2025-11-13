/**
 * API helper functions for consistent request handling
 * Provides authentication, response formatting, and logging utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Session } from 'next-auth';
import { createSuccessResponse, createErrorResponse, getRequestId } from './response';
import { ApiErrors } from './response';
import { redact } from '../config';

// Re-export ApiErrors for convenience
export { ApiErrors };

/**
 * Require an authenticated session
 * Returns the session if authenticated, otherwise returns an error response
 */
export async function requireSession(
  request: NextRequest
): Promise<{ session: Session; response?: NextResponse }> {
  const session = await getServerSession();
  
  if (!session?.user?.email) {
    const requestId = getRequestId(request);
    return {
      session: null as any,
      response: NextResponse.json(
        createErrorResponse(ApiErrors.unauthorized('Authentication required'), { requestId }),
        { status: 401 }
      ),
    };
  }
  
  return { session };
}

/**
 * Return a successful JSON response with standardized format
 */
export function okJson<T>(
  data: T,
  request: NextRequest,
  status: number = 200,
  meta?: Record<string, any>
): NextResponse {
  const requestId = getRequestId(request);
  const response = createSuccessResponse(data, { requestId, ...meta });
  return NextResponse.json(response, { status });
}

/**
 * Return an error JSON response with standardized format
 */
export function errJson(
  error: { code: string; message: string; details?: any; statusCode: number },
  request: NextRequest,
  meta?: Record<string, any>
): NextResponse {
  const requestId = getRequestId(request);
  const response = createErrorResponse(error, { requestId, ...meta });
  return NextResponse.json(response, { status: error.statusCode });
}

/**
 * Logging helper that redacts sensitive information
 */
export function logRequest(
  request: NextRequest,
  message: string,
  additionalData?: Record<string, any>
) {
  const requestId = getRequestId(request);
  const logData: Record<string, any> = {
    requestId,
    message,
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };

  // Redact sensitive fields
  if (logData.email) logData.email = redact(logData.email);
  if (logData.userId) logData.userId = redact(logData.userId);
  if (logData.token) logData.token = redact(logData.token);
  if (logData.secret) logData.secret = redact(logData.secret);

  console.log('📝 API Request:', JSON.stringify(logData, null, 2));
}

/**
 * Logging helper for errors with context
 */
export function logError(
  request: NextRequest,
  error: Error | unknown,
  context?: Record<string, any>
) {
  const requestId = getRequestId(request);
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const logData: Record<string, any> = {
    requestId,
    error: errorMessage,
    stack: errorStack,
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Redact sensitive fields
  if (logData.email) logData.email = redact(logData.email);
  if (logData.userId) logData.userId = redact(logData.userId);
  if (logData.token) logData.token = redact(logData.token);

  console.error('❌ API Error:', JSON.stringify(logData, null, 2));
}

