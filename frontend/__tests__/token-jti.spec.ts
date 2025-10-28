/**
 * Tests for token jti consume/check helpers
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

// Mock environment variables before imports
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key';
});

import { consumeTokenJti, recordTokenJtiConsumed } from '@/lib/tokens';

// Mock Supabase
vi.mock('@/lib/supabase-auth', () => ({
  getSupabaseClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}));

describe('Token JTI Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('consumeTokenJti', () => {
    it('should return success when jti is not already used', async () => {
      const { getSupabaseClient } = await import('@/lib/supabase-auth');
      const mockClient = getSupabaseClient();

      const result = await consumeTokenJti('jti-123');

      expect(result.success).toBe(true);
      expect(result.alreadyUsed).toBe(false);
      expect(mockClient.from).toHaveBeenCalledWith('email_events');
    });

    it('should detect already used jti', async () => {
      const { getSupabaseClient } = await import('@/lib/supabase-auth');
      const mockClient = getSupabaseClient();

      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: { id: 'existing-event' },
        error: null,
      });

      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: maybeSingleMock,
          }),
        }),
      } as any);

      const result = await consumeTokenJti('jti-already-used');

      expect(result.success).toBe(true);
      expect(result.alreadyUsed).toBe(true);
    });

    it('should handle empty jti', async () => {
      const result = await consumeTokenJti('');

      expect(result.success).toBe(false);
      expect(result.alreadyUsed).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const { getSupabaseClient } = await import('@/lib/supabase-auth');
      const mockClient = getSupabaseClient();

      const maybeSingleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }, // This is fine - means not found
      });

      vi.mocked(mockClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: maybeSingleMock,
          }),
        }),
      } as any);

      const result = await consumeTokenJti('jti-123');

      // PGRST116 means not found, which is fine
      expect(result.success).toBe(true);
      expect(result.alreadyUsed).toBe(false);
    });
  });

  describe('recordTokenJtiConsumed', () => {
    it('should record token jti as consumed', async () => {
      const { getSupabaseClient } = await import('@/lib/supabase-auth');
      const mockClient = getSupabaseClient();

      const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });

      vi.mocked(mockClient.from).mockReturnValue({
        insert: insertMock,
      } as any);

      await recordTokenJtiConsumed('jti-123', 'user-123', 'unsubscribe_via_token');

      expect(insertMock).toHaveBeenCalled();
      const insertCall = insertMock.mock.calls[0][0];
      expect(insertCall.message_id).toBe('jti-123');
      expect(insertCall.user_id).toBe('user-123');
      expect(insertCall.event_type).toBe('unsubscribe_via_token');
      expect(insertCall.email_provider).toBe('internal');
    });

    it('should handle empty jti gracefully', async () => {
      const { getSupabaseClient } = await import('@/lib/supabase-auth');
      const mockClient = getSupabaseClient();

      const insertMock = vi.fn();

      vi.mocked(mockClient.from).mockReturnValue({
        insert: insertMock,
      } as any);

      await recordTokenJtiConsumed('', 'user-123');

      // Should not insert if jti is empty
      expect(insertMock).not.toHaveBeenCalled();
    });

    it('should not throw on insert errors (best-effort)', async () => {
      const { getSupabaseClient } = await import('@/lib/supabase-auth');
      const mockClient = getSupabaseClient();

      const insertMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      vi.mocked(mockClient.from).mockReturnValue({
        insert: insertMock,
      } as any);

      // Should not throw
      await expect(
        recordTokenJtiConsumed('jti-123', 'user-123')
      ).resolves.not.toThrow();
    });
  });
});

