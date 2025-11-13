/**
 * Tests for setPlan function and plan synchronization
 */

import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';

let setPlan: typeof import('@/lib/stripe/plan-sync')['setPlan'];

const supabaseClient = {
  from: vi.fn(),
};
const getSupabaseClientMock = vi.fn(() => supabaseClient);

vi.mock('@/lib/supabase-auth', () => ({
  getSupabaseClient: getSupabaseClientMock,
}));

type SelectResult = { data: any; error: any };

function createSelectMock(result: SelectResult) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const single = vi.fn().mockResolvedValue(result);
  return vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({ maybeSingle, single }),
  });
}

function createUpdateMock(result: SelectResult) {
  const select = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  return { update, select, eq };
}

function plansTableMocks(options: {
  currentPlan?: SelectResult;
  updateResult?: SelectResult;
  retryResult?: SelectResult;
  insertResult?: { error: any };
}) {
  const current = options.currentPlan ?? { data: null, error: null };
  const updateResponse = options.updateResult ?? { data: [{ id: 'plan-1' }], error: null };
  const retryResponse = options.retryResult ?? { data: [{ id: 'plan-1' }], error: null };

  const selectMock = createSelectMock(current);
  const { update } = createUpdateMock(updateResponse);

  const retrySelect = vi.fn().mockResolvedValue(retryResponse);
  const retryEq = vi.fn().mockReturnValue({ select: retrySelect });
  const retryUpdate = vi.fn().mockReturnValue({ eq: retryEq });

  const insert = vi.fn().mockResolvedValue({ data: null, error: options.insertResult?.error ?? null });

  return {
    select: selectMock,
    update,
    retrySelect,
    retryUpdate,
    insert,
  };
}

function webhookTableMocks(result: SelectResult) {
  const selectMock = createSelectMock(result);
  const insert = vi.fn().mockResolvedValue({ data: null, error: null });
  return { select: selectMock, insert };
}

function configureSupabaseTables(tables: Record<string, any>) {
  supabaseClient.from.mockImplementation((table: string) => {
    return tables[table] ?? {
      select: createSelectMock({ data: null, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [{ id: 'default' }], error: null }) }),
      }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key';
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST = 'pk_test';
  process.env.STRIPE_SECRET_KEY_TEST = 'sk_test';
  process.env.RESEND_API_KEY = 'resend_test_key';
  process.env.EMAIL_TOKEN_SECRET = 'test_email_secret';

  const module = await import('@/lib/stripe/plan-sync');
  setPlan = module.setPlan;
});

describe('setPlan Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseClient.from.mockReset();
  });

  it('should set plan without Stripe event ID', async () => {
    const plans = plansTableMocks({});
    const webhook = webhookTableMocks({ data: null, error: null });

    configureSupabaseTables({
      plans,
      webhook_events: webhook,
    });

    await setPlan({
      userId: 'user-123',
      planType: 'pro',
      status: 'active',
    });

    expect(plans.update).toHaveBeenCalledTimes(1);
  });

  it('should handle idempotency with Stripe event ID', async () => {
    const plans = plansTableMocks({
      currentPlan: {
        data: { plan_type: 'pro', status: 'active', stripe_subscription_id: null },
        error: null,
      },
    });
    const webhook = webhookTableMocks({ data: { id: 'existing-event' }, error: null });

    configureSupabaseTables({
      plans,
      webhook_events: webhook,
    });

    await setPlan({
      userId: 'user-123',
      planType: 'pro',
      status: 'active',
      stripeEventId: 'evt_already_processed',
    });

    expect(plans.update).not.toHaveBeenCalled();
  });

  it('should record Stripe event ID after successful update', async () => {
    const plans = plansTableMocks({});
    const webhookInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const webhook = {
      select: createSelectMock({ data: null, error: null }),
      insert: webhookInsert,
    };

    configureSupabaseTables({
      plans,
      webhook_events: webhook,
    });

    await setPlan({
      userId: 'user-123',
      planType: 'pro',
      status: 'active',
      stripeEventId: 'evt_new_event',
    });

    expect(webhookInsert).toHaveBeenCalled();
    const payload = webhookInsert.mock.calls[0][0];
    expect(payload.stripe_event_id).toBe('evt_new_event');
    expect(payload.event_type).toBe('plan_update');
  });

  it('should set all plan fields correctly', async () => {
    const plans = plansTableMocks({});

    configureSupabaseTables({ plans });

    await setPlan({
      userId: 'user-123',
      planType: 'free',
      status: 'cancelled',
      stripeSubscriptionId: null,
      stripeCustomerId: 'cus_123',
      currentPeriodStart: '2024-01-01T00:00:00Z',
      currentPeriodEnd: '2024-02-01T00:00:00Z',
    });

    const updateArgs = plans.update.mock.calls[0][0];
    expect(updateArgs.plan_type).toBe('free');
    expect(updateArgs.status).toBe('cancelled');
    expect(updateArgs.stripe_subscription_id).toBeNull();
    expect(updateArgs.stripe_customer_id).toBe('cus_123');
    expect(updateArgs.current_period_start).toBe('2024-01-01T00:00:00Z');
    expect(updateArgs.current_period_end).toBe('2024-02-01T00:00:00Z');
    expect(updateArgs.updated_at).toBeTruthy();
  });

  it('should handle database errors', async () => {
    const plans = plansTableMocks({
      updateResult: { data: null, error: { message: 'Database error' } },
    });

    configureSupabaseTables({ plans });

    await expect(
      setPlan({
        userId: 'user-123',
        planType: 'pro',
        status: 'active',
      })
    ).rejects.toThrow('Failed to update plan');
  });
});

