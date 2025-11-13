/**
 * Request validation and sanitization utilities
 * Provides consistent validation across all API endpoints
 */

import { NextRequest } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';
import { handleValidationError } from './error-handler';

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  
  // Sorting
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
  
  // Search
  search: z.object({
    query: z.string().min(1).max(100),
    filters: z.record(z.any()).optional(),
  }),
  
  // User ID
  userId: z.string().uuid('Invalid user ID format'),
  
  // Email
  email: z.string().email('Invalid email format'),
  
  // Phone number (basic validation)
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format'),
  
  // Zip code (US format)
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid zip code format'),
  
  // Date range
  dateRange: z.object({
    startDate: z.string().datetime('Invalid start date format'),
    endDate: z.string().datetime('Invalid end date format'),
  }).refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    'Start date must be before end date'
  ),
  
  // File upload
  fileUpload: z.object({
    filename: z.string().min(1).max(255),
    mimetype: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*$/, 'Invalid file type'),
    size: z.number().int().min(1).max(10 * 1024 * 1024), // 10MB max
  }),
};

/**
 * Validate request body against a schema
 */
export function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: Response } {
  try {
    // This is a placeholder - in a real implementation, you'd parse the request body
    // For now, we'll assume the body is already parsed and available
    const body = request.body;
    
    if (!body) {
      return {
        success: false,
        response: handleValidationError(
          [{ field: 'body', message: 'Request body is required' }],
          request
        ),
      };
    }
    
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      return {
        success: false,
        response: handleValidationError(validationErrors, request),
      };
    }
    
    throw error;
  }
}

/**
 * Validate query parameters against a schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; response: Response } {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    
    const data = schema.parse(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      return {
        success: false,
        response: handleValidationError(validationErrors, request),
      };
    }
    
    throw error;
  }
}

/**
 * Validate path parameters against a schema
 */
export function validatePathParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
  params: Record<string, string>
): { success: true; data: T } | { success: false; response: Response } {
  try {
    const data = schema.parse(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      return {
        success: false,
        response: handleValidationError(validationErrors, request),
      };
    }
    
    throw error;
  }
}

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break SQL
    .substring(0, 1000); // Limit length
}

/**
 * Sanitize object by recursively sanitizing string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      (sanitized as any)[key] = sanitizeString(sanitized[key] as string);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      (sanitized as any)[key] = sanitizeObject(sanitized[key] as Record<string, any>);
    }
  }
  
  return sanitized;
}

/**
 * Validate and sanitize request data
 */
export function validateAndSanitize<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
  data: any
): { success: true; data: T } | { success: false; response: Response } {
  try {
    // First validate
    const validated = schema.parse(data);
    
    // Then sanitize
    const sanitized = sanitizeObject(validated as Record<string, any>) as T;
    
    return { success: true, data: sanitized };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      return {
        success: false,
        response: handleValidationError(validationErrors, request),
      };
    }
    
    throw error;
  }
}

/**
 * Validate email format with additional checks
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  if (email.length > 254) {
    return { valid: false, error: 'Email address too long' };
  }
  
  // Check for common disposable email domains
  const disposableDomains = [
    '10minutemail.com',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (disposableDomains.includes(domain)) {
    return { valid: false, error: 'Disposable email addresses are not allowed' };
  }
  
  return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: { name: string; type: string; size: number },
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif'],
  maxSize: number = 5 * 1024 * 1024 // 5MB
): { valid: boolean; error?: string } {
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: `File size ${file.size} exceeds maximum allowed size ${maxSize}` };
  }
  
  if (file.name.length > 255) {
    return { valid: false, error: 'File name too long' };
  }
  
  return { valid: true };
}
