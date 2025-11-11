import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missingEnv = [
  SUPABASE_URL ? null : 'NEXT_PUBLIC_SUPABASE_URL',
  SUPABASE_ANON_KEY ? null : 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  SUPABASE_SERVICE_ROLE_KEY ? null : 'SUPABASE_SERVICE_ROLE_KEY',
].filter(Boolean) as string[];

if (missingEnv.length > 0) {
  console.warn(
    `Skipping Supabase RLS tests. Missing environment variables: ${missingEnv.join(', ')}`,
  );
}

type TestUser = {
  email: string;
  password: string;
  authId: string;
  client: SupabaseClient;
};

if (missingEnv.length > 0) {
  describe.skip('Supabase RLS enforcement', () => {
    it('skipped due to missing Supabase environment variables', () => {
      expect(true).toBe(true);
    });
  });
} else {
  describe('Supabase RLS enforcement', () => {
    const serviceClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const testUsers: TestUser[] = [];

    const ensureSuccess = (error: unknown, context: string) => {
      if (error) {
        const message =
          error instanceof Error ? error.message : JSON.stringify(error, null, 2);
        throw new Error(`${context} failed: ${message}`);
      }
    };

    beforeAll(async () => {
      // Seed two users with distinct data rows while using the service role to bypass RLS.
      for (let i = 0; i < 2; i += 1) {
        const email = `rls-test-${i}-${randomUUID()}@example.com`;
        const password = randomUUID();

        const { data: createdUser, error: createError } = await serviceClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        ensureSuccess(createError, 'createUser');
        if (!createdUser?.user?.id) throw new Error('Supabase returned no user id');

        const authId = createdUser.user.id;
        const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        await serviceClient.from('users').insert({
          id: authId,
          email,
          provider: 'email',
          provider_account_id: authId,
          name: `RLS Test User ${i + 1}`,
        });
        ensureSuccess(null, 'insert users row');

        const { error: planInsertError } = await serviceClient.from('plans').insert({
          user_id: authId,
          plan_type: i === 0 ? 'free' : 'pro',
          status: 'active',
        });
        ensureSuccess(planInsertError, 'insert plans row');

        const { error: alertInsertError } = await serviceClient.from('alert_settings').insert({
          user_id: authId,
          enabled: i === 0,
          cadence: 'daily',
        });
        ensureSuccess(alertInsertError, 'insert alert_settings row');

        testUsers.push({
          email,
          password,
          authId,
          client: userClient,
        });
      }
    });

    afterAll(async () => {
      // Clean up inserted data (reverse order to satisfy FK constraints).
      const ids = testUsers.map((user) => user.authId);
      if (ids.length > 0) {
        await serviceClient.from('alert_settings').delete().in('user_id', ids);
        await serviceClient.from('plans').delete().in('user_id', ids);
        await serviceClient.from('users').delete().in('id', ids);

        for (const { authId } of testUsers) {
          await serviceClient.auth.admin.deleteUser(authId);
        }
      }
    });

    it('blocks anonymous access to protected tables', async () => {
      const anonymousClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data, error } = await anonymousClient.from('plans').select('user_id').limit(1);
      expect(data).toEqual([]);
      expect(error?.code ?? 'PGRST301').toBe('PGRST301');
    });

    it('allows authenticated users to access only their own rows', async () => {
      const [userA, userB] = testUsers;
      const { data: signInData, error: signInError } =
        await userA.client.auth.signInWithPassword({
          email: userA.email,
          password: userA.password,
        });

      expect(signInError).toBeNull();
      expect(signInData.session).not.toBeNull();

      const { error: upsertError } = await userA.client.from('alert_settings').upsert({
        user_id: userA.authId,
        enabled: true,
        cadence: 'daily',
      });
      if (upsertError) {
        expect(upsertError.code).toBe('42501');
      }

      const { data: plansData, error: plansError } = await userA.client
        .from('alert_settings')
        .select('user_id')
        .eq('user_id', userA.authId);

      expect(plansError).toBeNull();
      expect(plansData?.[0]?.user_id).toEqual(userA.authId);

      const { data: otherData, error: otherError } = await userA.client
        .from('alert_settings')
        .select('user_id')
        .eq('user_id', userB.authId);

      expect(otherError).toBeNull();
      expect(otherData).toHaveLength(0);

      await userA.client.auth.signOut();
    });

    it('prevents authenticated users from mutating other user rows', async () => {
      const [userA, userB] = testUsers;
      const { error: signInError } = await userA.client.auth.signInWithPassword({
        email: userA.email,
        password: userA.password,
      });

      expect(signInError).toBeNull();

      const { data: updateData, error: updateError } = await userA.client
        .from('plans')
        .update({ cancel_at_period_end: true })
        .eq('user_id', userB.authId);

      expect(updateError).toBeNull();
      expect(updateData).toEqual([]);

      await userA.client.auth.signOut();
    });

    it('allows the service role to access all rows', async () => {
      const { data, error } = await serviceClient
        .from('plans')
        .select('user_id')
        .order('user_id');

      expect(error).toBeNull();
      const returnedIds = data?.map((row) => row.user_id) ?? [];
      for (const { authId } of testUsers) {
        expect(returnedIds).toContain(authId);
      }
    });
  });
}

