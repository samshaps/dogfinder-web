/**
 * Tests for API helper functions (requireSession, okJson, errJson)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock config before any imports that use it
vi.mock('@/lib/config', () => ({
  appConfig: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test_key',
    stripePublishableKey: 'pk_test',
    stripeSecretKey: 'sk_test',
    emailTokenSecret: 'test_secret',
  },
  redact: (val?: string) => val ? `${val.slice(0, 2)}••••${val.slice(-2)}` : val,
}));

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Import after mocks
import { requireSession, okJson, errJson, ApiErrors } from '@/lib/api/helpers';

describe('API Helpers', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/api/test', {
      method: 'GET',
      headers: {
        'x-request-id': 'test-request-123',
      },
    });
  });

  describe('requireSession', () => {
    it('should return session when authenticated', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          email: 'test@example.com',
          name: 'Test User',
        },
        expires: '2024-12-31',
      } as any);

      const result = await requireSession(mockRequest);

      expect(result.session).toBeTruthy();
      expect(result.session?.user?.email).toBe('test@example.com');
      expect(result.response).toBeUndefined();
    });

    it('should return error response when not authenticated', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue(null);

      const result = await requireSession(mockRequest);

      expect(result.session).toBeFalsy();
      expect(result.response).toBeTruthy();
      expect(result.response?.status).toBe(401);
    });

    it('should return error response when session has no email', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          name: 'Test User',
          // No email
        },
        expires: '2024-12-31',
      } as any);

      const result = await requireSession(mockRequest);

      expect(result.response).toBeTruthy();
      expect(result.response?.status).toBe(401);
    });
  });

  describe('okJson', () => {
    it('should return successful JSON response with data', async () => {
      const data = { message: 'Success', id: 123 };
      const response = okJson(data, mockRequest);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
      expect(json.meta?.requestId).toBe('test-request-123');
      expect(json.meta?.timestamp).toBeTruthy();
    });

    it('should accept custom status code', async () => {
      const data = { created: true };
      const response = okJson(data, mockRequest, 201);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
    });

    it('should include custom meta data', async () => {
      const data = { result: 'test' };
      const response = okJson(data, mockRequest, 200, { version: '1.0' });

      const json = await response.json();
      expect(json.meta?.version).toBe('1.0');
      expect(json.meta?.requestId).toBe('test-request-123');
    });
  });

  describe('errJson', () => {
    it('should return error JSON response', async () => {
      const error = ApiErrors.notFound('Resource');
      const response = errJson(error, mockRequest);

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBeTruthy();
      expect(json.error?.code).toBe('NOT_FOUND');
      expect(json.error?.message).toContain('Resource');
      expect(json.meta?.requestId).toBe('test-request-123');
    });

    it('should handle validation errors', async () => {
      const error = ApiErrors.validationError('Invalid input', {
        field: 'email',
        message: 'Email is required',
      });
      const response = errJson(error, mockRequest);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error?.code).toBe('VALIDATION_ERROR');
      expect(json.error?.details).toBeTruthy();
    });

    it('should include custom meta data', async () => {
      const error = ApiErrors.internalError('Server error');
      const response = errJson(error, mockRequest, { traceId: 'trace-123' });

      const json = await response.json();
      expect(json.meta?.traceId).toBe('trace-123');
    });
  });

  describe('ApiErrors', () => {
    it('should create unauthorized error', () => {
      const error = ApiErrors.unauthorized();
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
    });

    it('should create notFound error with resource name', () => {
      const error = ApiErrors.notFound('User');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toContain('User');
    });

    it('should create validation error with details', () => {
      const details = { field: 'email', message: 'Invalid format' };
      const error = ApiErrors.validationError('Validation failed', details);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
    });

    it('should create rate limit error', () => {
      const error = ApiErrors.rateLimitExceeded();
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.statusCode).toBe(429);
    });
  });
});

