/**
 * DogYenta v2 - Initial Schema
 * Creates all 6 core tables: users, plans, preferences, alert_settings, email_events, dog_cache
 */

exports.up = (pgm) => {
  // Enable required extensions
  pgm.sql(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  `);

  // Users table - authenticated user accounts
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255),
      image TEXT,
      provider VARCHAR(50) NOT NULL DEFAULT 'google',
      provider_account_id VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_provider ON users(provider, provider_account_id);
  `);

  // Plans table - subscription status
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS plans (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      plan_type VARCHAR(50) NOT NULL DEFAULT 'free',
      stripe_customer_id VARCHAR(255) UNIQUE,
      stripe_subscription_id VARCHAR(255) UNIQUE,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_plans_plan_type ON plans(plan_type);
    CREATE INDEX idx_plans_stripe_customer ON plans(stripe_customer_id);
    CREATE INDEX idx_plans_stripe_subscription ON plans(stripe_subscription_id);
  `);

  // Preferences table - user's dog search preferences
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS preferences (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      location VARCHAR(255) NOT NULL,
      radius INTEGER NOT NULL DEFAULT 50,
      breed TEXT[],
      size TEXT[],
      age TEXT[],
      gender VARCHAR(20),
      good_with_children BOOLEAN,
      good_with_dogs BOOLEAN,
      good_with_cats BOOLEAN,
      house_trained BOOLEAN,
      special_needs BOOLEAN,
      lifestyle JSONB,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_preferences_location ON preferences(location);
  `);

  // Alert settings table - email alert configuration
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS alert_settings (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      cadence VARCHAR(20) NOT NULL DEFAULT 'daily',
      last_sent_at_utc TIMESTAMPTZ,
      last_seen_ids JSONB DEFAULT '[]'::jsonb,
      paused_until TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_alert_settings_enabled ON alert_settings(enabled);
    CREATE INDEX idx_alert_settings_cadence ON alert_settings(cadence);
    CREATE INDEX idx_alert_settings_last_sent ON alert_settings(last_sent_at_utc);
  `);

  // Email events table - log of all email-related events
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS email_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      email_provider VARCHAR(50),
      message_id VARCHAR(255),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_email_events_user ON email_events(user_id);
    CREATE INDEX idx_email_events_type ON email_events(event_type);
    CREATE INDEX idx_email_events_created ON email_events(created_at DESC);
    CREATE INDEX idx_email_events_message_id ON email_events(message_id);
  `);

  // Dog cache table - cached dog data from Petfinder API
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS dog_cache (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      petfinder_id VARCHAR(50) NOT NULL UNIQUE,
      fingerprint VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      age VARCHAR(20),
      breed VARCHAR(255),
      size VARCHAR(20),
      gender VARCHAR(20),
      city VARCHAR(100),
      state VARCHAR(2),
      shelter_name VARCHAR(255),
      shelter_id VARCHAR(100),
      photos JSONB DEFAULT '[]'::jsonb,
      description TEXT,
      attributes JSONB DEFAULT '{}'::jsonb,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      removed_at TIMESTAMPTZ,
      raw_data JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_dog_cache_petfinder ON dog_cache(petfinder_id);
    CREATE INDEX idx_dog_cache_fingerprint ON dog_cache(fingerprint);
    CREATE INDEX idx_dog_cache_location ON dog_cache(state, city);
    CREATE INDEX idx_dog_cache_first_seen ON dog_cache(first_seen_at DESC);
    CREATE INDEX idx_dog_cache_last_seen ON dog_cache(last_seen_at DESC);
    CREATE INDEX idx_dog_cache_removed ON dog_cache(removed_at) WHERE removed_at IS NULL;
  `);

  // Auto-update updated_at timestamp function
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON preferences
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_alert_settings_updated_at BEFORE UPDATE ON alert_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_dog_cache_updated_at BEFORE UPDATE ON dog_cache
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);

  // Insert test data for development
  pgm.sql(`
    INSERT INTO users (id, email, name, provider)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'test@dogyenta.com',
      'Test User',
      'google'
    ) ON CONFLICT (email) DO NOTHING;

    INSERT INTO plans (user_id, plan_type)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'free'
    ) ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO preferences (user_id, location, radius, size, age)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'San Francisco, CA',
      50,
      ARRAY['medium', 'large'],
      ARRAY['young', 'adult']
    ) ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO alert_settings (user_id, enabled, cadence)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      false,
      'daily'
    ) ON CONFLICT (user_id) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  // Rollback: drop all tables and functions
  pgm.sql(`
    DROP TRIGGER IF EXISTS update_dog_cache_updated_at ON dog_cache;
    DROP TRIGGER IF EXISTS update_alert_settings_updated_at ON alert_settings;
    DROP TRIGGER IF EXISTS update_preferences_updated_at ON preferences;
    DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;

    DROP FUNCTION IF EXISTS update_updated_at_column();

    DROP TABLE IF EXISTS dog_cache CASCADE;
    DROP TABLE IF EXISTS email_events CASCADE;
    DROP TABLE IF EXISTS alert_settings CASCADE;
    DROP TABLE IF EXISTS preferences CASCADE;
    DROP TABLE IF EXISTS plans CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);
};
