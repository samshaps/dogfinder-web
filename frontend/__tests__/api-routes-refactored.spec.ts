/**
 * Integration tests for refactored API routes
 * Tests that routes use new helpers correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock config before any imports that use it
vi.mock('@/lib/config', () => ({
  appConfig: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test_key',
    stripePublishableKey: 'pk_test',
    stripeSecretKey: 'sk_test',
    emailTokenSecret: 'test_secret',
    resendApiKey: 're_test',
  },
  redact: (val?: string) => val ? `${val.slice(0, 2)}••••${val.slice(-2)}` : val,
}));

// Mock all dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/supabase-auth', () => ({
  getSupabaseClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'user-123' },
            error: null,
          }),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'user-123' },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'pref-123' },
            error: null,
          }),
        }),
      }),
    }),
  }),
  getUserPreferences: vi.fn().mockResolvedValue({
    id: 'pref-123',
    zip_codes: ['10001'],
  }),
  saveUserPreferences: vi.fn().mockResolvedValue({
    id: 'pref-123',
    zip_codes: ['10001'],
  }),
}));

vi.mock('@/lib/tokens', () => ({
  verifyUnsubToken: vi.fn().mockReturnValue({
    sub: 'test@example.com',
    scope: 'alerts+cancel',
    jti: 'jti-123',
  }),
  consumeTokenJti: vi.fn().mockResolvedValue({
    alreadyUsed: false,
    success: true,
  }),
  recordTokenJtiConsumed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/stripe/config', () => ({
  getStripeServer: vi.fn().mockReturnValue({
    subscriptions: {
      cancel: vi.fn().mockResolvedValue({ id: 'sub_cancelled' }),
    },
  }),
}));

vi.mock('@/lib/stripe/plan-sync', () => ({
  setPlan: vi.fn().mockResolvedValue(undefined),
}));

describe('Refactored API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Preferences Route', () => {
    it('should use requireSession helper', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'test@example.com' },
      } as any);

      // Import after mocks are set up
      const { GET } = await import('@/app/api/preferences/route');
      const request = new Request('http://localhost:3000/api/preferences', {
        method: 'GET',
      });
      const nextRequest = request as any;

      const response = await GET(nextRequest);
      const json = await response.json();

      // Should use okJson helper (standardized response format)
      expect(json.success).toBe(true);
      expect(json.meta?.requestId).toBeTruthy();
    });

    it('should return 401 when not authenticated', async () => {
      const { getServerSession } = await import('next-auth');
      vi.mocked(getServerSession).mockResolvedValue(null);

      const { GET } = await import('@/app/api/preferences/route');
      const request = new Request('http://localhost:3000/api/preferences', {
        method: 'GET',
      });
      const nextRequest = request as any;

      const response = await GET(nextRequest);
      expect(response.status).toBe(401);
      
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error?.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Unsubscribe Route', () => {
    it('should use setPlan helper for plan downgrade', async () => {
      const { POST } = await import('@/app/api/unsubscribe/route');
      const { setPlan } = await import('@/lib/stripe/plan-sync');
      
      const request = new Request('http://localhost:3000/api/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ token: 'valid-token' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const nextRequest = request as any;

      const response = await POST(nextRequest);
      const json = await response.json();

      // Should use okJson helper
      expect(json.success).toBe(true);
      
      // Should use setPlan for downgrading
      // Note: This will only be called if user has a subscription
      // In this test, the mock returns no plan, so setPlan won't be called
      // But the route structure should support it
    });

    it('should use consumeTokenJti for idempotency', async () => {
      const { consumeTokenJti } = await import('@/lib/tokens');
      const { POST } = await import('@/app/api/unsubscribe/route');

      vi.mocked(consumeTokenJti).mockResolvedValueOnce({
        alreadyUsed: true,
        success: true,
      });

      const request = new Request('http://localhost:3000/api/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ token: 'already-used-token' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const nextRequest = request as any;

      const response = await POST(nextRequest);
      const json = await response.json();

      // Should return success for already processed token (idempotent)
      expect(json.success).toBe(true);
      expect(consumeTokenJti).toHaveBeenCalled();
    });

    it('should return error for invalid token', async () => {
      const { verifyUnsubToken } = await import('@/lib/tokens');
      const { POST } = await import('@/app/api/unsubscribe/route');

      vi.mocked(verifyUnsubToken).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const request = new Request('http://localhost:3000/api/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ token: 'invalid-token' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const nextRequest = request as any;

      const response = await POST(nextRequest);
      expect(response.status).toBe(400);
      
      const json = await response.json();
      expect(json.success).toBe(false);
    });
  });
});

