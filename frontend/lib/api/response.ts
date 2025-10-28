/**
 * Standardized API response formats and error handling
 * Provides consistent response structure across all API endpoints
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

// Standard error codes
export const ERROR_CODES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resource Management
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // External Services
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  STRIPE_ERROR: 'STRIPE_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',
  
  // API Versioning
  INVALID_VERSION: 'INVALID_VERSION',
  VERSION_SUNSET: 'VERSION_SUNSET',
  VERSION_DEPRECATED: 'VERSION_DEPRECATED',
  VERSION_NOT_SUPPORTED: 'VERSION_NOT_SUPPORTED',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// HTTP status code mappings
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Partial<ApiResponse['meta']>
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Create a paginated API response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  meta?: Partial<ApiResponse['meta']>
): PaginatedResponse<T> {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  
  return {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse(
  error: ApiError,
  meta?: Partial<ApiResponse['meta']>
): ApiResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Create a standardized API error
 */
export function createApiError(
  code: ErrorCode,
  message: string,
  statusCode: number,
  details?: any
): ApiError {
  return {
    code,
    message,
    details,
    statusCode,
  };
}

/**
 * Common error creators for consistency
 */
export const ApiErrors = {
  unauthorized: (message = 'Unauthorized') => 
    createApiError(ERROR_CODES.UNAUTHORIZED, message, HTTP_STATUS.UNAUTHORIZED),
  
  forbidden: (message = 'Forbidden') => 
    createApiError(ERROR_CODES.FORBIDDEN, message, HTTP_STATUS.FORBIDDEN),
  
  notFound: (resource = 'Resource') => 
    createApiError(ERROR_CODES.NOT_FOUND, `${resource} not found`, HTTP_STATUS.NOT_FOUND),
  
  validationError: (message: string, details?: any) => 
    createApiError(ERROR_CODES.VALIDATION_ERROR, message, HTTP_STATUS.BAD_REQUEST, details),
  
  rateLimitExceeded: (message = 'Rate limit exceeded') => 
    createApiError(ERROR_CODES.RATE_LIMIT_EXCEEDED, message, HTTP_STATUS.TOO_MANY_REQUESTS),
  
  internalError: (message = 'Internal server error') => 
    createApiError(ERROR_CODES.INTERNAL_ERROR, message, HTTP_STATUS.INTERNAL_SERVER_ERROR),
  
  stripeError: (message: string, details?: any) => 
    createApiError(ERROR_CODES.STRIPE_ERROR, message, HTTP_STATUS.BAD_REQUEST, details),
  
  emailServiceError: (message: string, details?: any) => 
    createApiError(ERROR_CODES.EMAIL_SERVICE_ERROR, message, HTTP_STATUS.SERVICE_UNAVAILABLE, details),
  
  databaseError: (message: string, details?: any) => 
    createApiError(ERROR_CODES.DATABASE_ERROR, message, HTTP_STATUS.SERVICE_UNAVAILABLE, details),
};

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Extract request ID from headers or generate new one
 */
export function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') || generateRequestId();
}
