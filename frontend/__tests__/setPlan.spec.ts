/**
 * Tests for setPlan function and plan synchronization
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

// Mock environment variables before imports
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key';
});

import { setPlan } from '@/lib/stripe/plan-sync';

// Mock Supabase
vi.mock('@/lib/supabase-auth', () => ({
  getSupabaseClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}));

describe('setPlan Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set plan without Stripe event ID', async () => {
    const { getSupabaseClient } = await import('@/lib/supabase-auth');
    const mockClient = getSupabaseClient();

    await setPlan({
      userId: 'user-123',
      planType: 'pro',
      status: 'active',
    });

    // Verify update was called
    expect(mockClient.from).toHaveBeenCalledWith('plans');
    const updateCall = vi.mocked(mockClient.from).mock.results[0]?.value?.update;
    expect(updateCall).toHaveBeenCalled();
  });

  it('should handle idempotency with Stripe event ID', async () => {
    const { getSupabaseClient } = await import('@/lib/supabase-auth');
    const mockClient = getSupabaseClient();

    // Mock that event already exists
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { id: 'existing-event' },
      error: null,
    });
    
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    
    let callCount = 0;
    vi.mocked(mockClient.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: check for existing event
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: maybeSingleMock,
            }),
          }),
        } as any;
      } else {
        // Second call (shouldn't happen): update plan
        return {
          update: updateMock,
        } as any;
      }
    });

    await setPlan({
      userId: 'user-123',
      planType: 'pro',
      status: 'active',
      stripeEventId: 'evt_already_processed',
    });

    // Should check for existing event
    expect(maybeSingleMock).toHaveBeenCalled();
    
    // Should NOT update plan if event already exists (idempotency)
    // Only one call to from() should happen (the check)
    expect(callCount).toBe(1);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should record Stripe event ID after successful update', async () => {
    const { getSupabaseClient } = await import('@/lib/supabase-auth');
    const mockClient = getSupabaseClient();
    
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    
    vi.mocked(mockClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      insert: insertMock,
    } as any);

    await setPlan({
      userId: 'user-123',
      planType: 'pro',
      status: 'active',
      stripeEventId: 'evt_new_event',
    });

    // Should insert webhook event record
    expect(insertMock).toHaveBeenCalled();
    const insertCall = insertMock.mock.calls[0][0];
    expect(insertCall.stripe_event_id).toBe('evt_new_event');
    expect(insertCall.event_type).toBe('plan_update');
  });

  it('should set all plan fields correctly', async () => {
    const { getSupabaseClient } = await import('@/lib/supabase-auth');
    const mockClient = getSupabaseClient();
    
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    
    vi.mocked(mockClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: updateMock,
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as any);

    await setPlan({
      userId: 'user-123',
      planType: 'free',
      status: 'cancelled',
      stripeSubscriptionId: null,
      stripeCustomerId: 'cus_123',
      currentPeriodStart: '2024-01-01T00:00:00Z',
      currentPeriodEnd: '2024-02-01T00:00:00Z',
    });

    const updateCall = updateMock.mock.calls[0][0];
    expect(updateCall.plan_type).toBe('free');
    expect(updateCall.status).toBe('cancelled');
    expect(updateCall.stripe_subscription_id).toBeNull();
    expect(updateCall.stripe_customer_id).toBe('cus_123');
    expect(updateCall.current_period_start).toBe('2024-01-01T00:00:00Z');
    expect(updateCall.current_period_end).toBe('2024-02-01T00:00:00Z');
    expect(updateCall.updated_at).toBeTruthy();
  });

  it('should handle database errors', async () => {
    const { getSupabaseClient } = await import('@/lib/supabase-auth');
    const mockClient = getSupabaseClient();
    
    vi.mocked(mockClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }),
    } as any);

    await expect(
      setPlan({
        userId: 'user-123',
        planType: 'pro',
        status: 'active',
      })
    ).rejects.toThrow('Failed to update plan');
  });
});

