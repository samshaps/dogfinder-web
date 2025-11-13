-- Enable Row Level Security across core tables and define granular policies
-- This migration ensures end users can only access their own records while
-- allowing service role automation to continue operating.

----------------------------
-- Users table
----------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON users
      FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON users
      FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Service role manages users'
  ) THEN
    CREATE POLICY "Service role manages users" ON users
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

----------------------------
-- Plans table
----------------------------
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'plans' AND policyname = 'Users can view own plan'
  ) THEN
    CREATE POLICY "Users can view own plan" ON plans
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'plans' AND policyname = 'Users can update own plan'
  ) THEN
    CREATE POLICY "Users can update own plan" ON plans
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'plans' AND policyname = 'Service role manages plans'
  ) THEN
    CREATE POLICY "Service role manages plans" ON plans
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

----------------------------
-- Preferences table
----------------------------
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'preferences' AND policyname = 'Users can view own preferences'
  ) THEN
    CREATE POLICY "Users can view own preferences" ON preferences
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'preferences' AND policyname = 'Users can modify own preferences'
  ) THEN
    CREATE POLICY "Users can modify own preferences" ON preferences
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'preferences' AND policyname = 'Service role manages preferences'
  ) THEN
    CREATE POLICY "Service role manages preferences" ON preferences
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

----------------------------
-- Alert settings table
----------------------------
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'alert_settings' AND policyname = 'Users can view own alert settings'
  ) THEN
    CREATE POLICY "Users can view own alert settings" ON alert_settings
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'alert_settings' AND policyname = 'Users can modify own alert settings'
  ) THEN
    CREATE POLICY "Users can modify own alert settings" ON alert_settings
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'alert_settings' AND policyname = 'Service role manages alert settings'
  ) THEN
    CREATE POLICY "Service role manages alert settings" ON alert_settings
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

----------------------------
-- Email events table
----------------------------
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'email_events' AND policyname = 'Users can view own email events'
  ) THEN
    CREATE POLICY "Users can view own email events" ON email_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'email_events' AND policyname = 'Service role manages email events'
  ) THEN
    CREATE POLICY "Service role manages email events" ON email_events
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

----------------------------
-- Dog cache table
----------------------------
ALTER TABLE dog_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE dog_cache FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dog_cache' AND policyname = 'Public read access to dog cache'
  ) THEN
    CREATE POLICY "Public read access to dog cache" ON dog_cache
      FOR SELECT
      USING (auth.role() IN ('anon', 'authenticated', 'service_role'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dog_cache' AND policyname = 'Service role manages dog cache'
  ) THEN
    CREATE POLICY "Service role manages dog cache" ON dog_cache
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

