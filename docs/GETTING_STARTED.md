# Getting Started - DogYenta v2

Welcome to DogYenta v2 development! This guide will get you set up and ready to implement the first slice.

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This will install all dependencies including:
- `pg` - PostgreSQL client
- `node-pg-migrate` - Migration tool
- Existing Next.js and React packages

### 2. Set Up Environment Variables

```bash
# Copy the template
cp ENV_TEMPLATE.txt .env.local

# Generate a secret for NextAuth
openssl rand -base64 32

# Paste the output into .env.local as NEXTAUTH_SECRET
```

**Minimum required for Module 1 (Data Layer)**:
- `DATABASE_URL` - Already set for local Postgres

You'll add other credentials as you implement later modules.

### 3. Start Postgres

```bash
# From frontend directory
docker-compose up -d

# Verify it's running
docker ps
# Should see: dogfinder-postgres

# Check logs if needed
docker-compose logs -f postgres
```

### 4. Test Database Connection

```bash
# Start the dev server
npm run dev

# In another terminal or browser, test the health endpoint
curl http://localhost:3000/api/health

# Should return:
# {
#   "status": "ok",
#   "database": "connected",
#   ...
# }
```

### 5. Create Your First Migration

```bash
# Create the migration file
npm run migrate:create initial-schema

# This creates: migrations/[timestamp]_initial-schema.sql
```

The migration file will have two sections:
- `-- Up Migration` - What to run when applying
- `-- Down Migration` - How to rollback

See the next section for what to put in this file.

---

## 📊 Module 1, Slice 1.2: Database Schema

Now you're ready to implement the first slice! Here's the SQL for all 6 tables.

Open `migrations/[timestamp]_initial-schema.sql` and paste this:

```sql
-- Up Migration
-- Create all 6 tables for DogYenta v2

-- ============================================
-- Table: users
-- Stores authenticated user accounts
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  image TEXT, -- Profile picture URL from OAuth
  provider VARCHAR(50) NOT NULL DEFAULT 'google', -- OAuth provider
  provider_account_id VARCHAR(255), -- Provider's user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_account_id);

-- ============================================
-- Table: plans
-- Tracks user subscription status
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(50) NOT NULL DEFAULT 'free', -- 'free', 'pro_active', 'pro_past_due', 'pro_canceled_effective'
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- Stripe subscription status
  current_period_end TIMESTAMPTZ, -- When current billing period ends
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_tier ON plans(tier);
CREATE INDEX idx_plans_stripe_customer ON plans(stripe_customer_id);
CREATE INDEX idx_plans_stripe_subscription ON plans(stripe_subscription_id);

-- ============================================
-- Table: preferences
-- User's dog search preferences
-- ============================================
CREATE TABLE IF NOT EXISTS preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  location VARCHAR(255) NOT NULL, -- City, State or ZIP
  radius INTEGER NOT NULL DEFAULT 50, -- Miles
  breed TEXT[], -- Array of breed names/IDs
  size TEXT[], -- 'small', 'medium', 'large', 'xlarge'
  age TEXT[], -- 'baby', 'young', 'adult', 'senior'
  gender VARCHAR(20), -- 'male', 'female', null (any)
  good_with_children BOOLEAN,
  good_with_dogs BOOLEAN,
  good_with_cats BOOLEAN,
  house_trained BOOLEAN,
  special_needs BOOLEAN,
  lifestyle JSONB, -- Flexible field for additional preferences
  notes TEXT, -- Free-form notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_preferences_location ON preferences(location);

-- ============================================
-- Table: alert_settings
-- User's email alert configuration
-- ============================================
CREATE TABLE IF NOT EXISTS alert_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  cadence VARCHAR(20) NOT NULL DEFAULT 'daily', -- 'daily' or 'weekly'
  last_sent_at_utc TIMESTAMPTZ, -- When last alert was sent
  last_seen_ids JSONB DEFAULT '[]'::jsonb, -- Array of dog IDs sent in last alert
  paused_until TIMESTAMPTZ, -- Temporary pause (e.g., "pause for 1 week")
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_settings_enabled ON alert_settings(enabled);
CREATE INDEX idx_alert_settings_cadence ON alert_settings(cadence);
CREATE INDEX idx_alert_settings_last_sent ON alert_settings(last_sent_at_utc);

-- ============================================
-- Table: email_events
-- Log of all email-related events
-- ============================================
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'
  email_provider VARCHAR(50), -- 'resend', 'ses', etc.
  message_id VARCHAR(255), -- Provider's message ID
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional event data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_events_user ON email_events(user_id);
CREATE INDEX idx_email_events_type ON email_events(event_type);
CREATE INDEX idx_email_events_created ON email_events(created_at DESC);
CREATE INDEX idx_email_events_message_id ON email_events(message_id);

-- ============================================
-- Table: dog_cache
-- Cached dog data from Petfinder API
-- ============================================
CREATE TABLE IF NOT EXISTS dog_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petfinder_id VARCHAR(50) NOT NULL UNIQUE, -- Petfinder's dog ID
  fingerprint VARCHAR(255) NOT NULL, -- Hash of key attributes for deduplication
  name VARCHAR(255) NOT NULL,
  age VARCHAR(20),
  breed VARCHAR(255),
  size VARCHAR(20),
  gender VARCHAR(20),
  city VARCHAR(100),
  state VARCHAR(2),
  shelter_name VARCHAR(255),
  shelter_id VARCHAR(100),
  photos JSONB DEFAULT '[]'::jsonb, -- Array of photo URLs
  description TEXT,
  attributes JSONB DEFAULT '{}'::jsonb, -- Good with kids/dogs/cats, house trained, etc.
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When first scraped
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Last time seen in API
  removed_at TIMESTAMPTZ, -- When dog was no longer in API (adopted/removed)
  raw_data JSONB, -- Full API response for reference
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dog_cache_petfinder ON dog_cache(petfinder_id);
CREATE INDEX idx_dog_cache_fingerprint ON dog_cache(fingerprint);
CREATE INDEX idx_dog_cache_location ON dog_cache(state, city);
CREATE INDEX idx_dog_cache_first_seen ON dog_cache(first_seen_at DESC);
CREATE INDEX idx_dog_cache_last_seen ON dog_cache(last_seen_at DESC);
CREATE INDEX idx_dog_cache_removed ON dog_cache(removed_at) WHERE removed_at IS NULL;

-- ============================================
-- Functions & Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
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

-- ============================================
-- Initial Data
-- ============================================

-- Insert test user for development
INSERT INTO users (id, email, name, provider)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@dogyenta.com',
  'Test User',
  'google'
) ON CONFLICT (email) DO NOTHING;

-- Give test user a free plan
INSERT INTO plans (user_id, tier)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'free'
) ON CONFLICT (user_id) DO NOTHING;

-- Add test preferences
INSERT INTO preferences (user_id, location, radius, size, age)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'San Francisco, CA',
  50,
  ARRAY['medium', 'large'],
  ARRAY['young', 'adult']
) ON CONFLICT (user_id) DO NOTHING;

-- Add test alert settings (disabled)
INSERT INTO alert_settings (user_id, enabled, cadence)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  false,
  'daily'
) ON CONFLICT (user_id) DO NOTHING;


-- Down Migration
-- Rollback: drop all tables and functions

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
```

### Run the Migration

```bash
npm run migrate:up
```

You should see output like:
```
> dogfinder-web@0.1.0 migrate:up
> node-pg-migrate up

Running migration 20250109120000_initial-schema.sql
Migration 20250109120000_initial-schema.sql completed
```

### Verify the Tables

```bash
# Connect to database
docker exec -it dogfinder-postgres psql -U dogfinder -d dogfinder_dev

# List tables
\dt

# You should see:
#  public | alert_settings
#  public | dog_cache
#  public | email_events
#  public | pgmigrations
#  public | plans
#  public | preferences
#  public | users

# Check test user
SELECT * FROM users;

# Exit psql
\q
```

Or use a GUI tool like TablePlus, Postico, or pgAdmin with:
- Host: localhost
- Port: 5432
- Database: dogfinder_dev
- User: dogfinder
- Password: dogfinder_dev

---

## ✅ Slice 1.2 Acceptance Criteria

- [x] Migration for `users` table
- [x] Migration for `plans` table with FK to users
- [x] Migration for `preferences` table with FK to users
- [x] Migration for `alert_settings` table with FK to users
- [x] Migration for `email_events` table with FK to users
- [x] Migration for `dog_cache` table
- [x] All FKs, indices, and constraints in place
- [x] Seed script with test data (included in migration)

Test with:
```bash
curl http://localhost:3000/api/health
# Should return: {"status": "ok", "database": "connected", ...}
```

---

## 🎯 Next Steps

Congratulations! You've completed Module 1. Your database is ready.

**Next Module: Module 2 - Foundations & Analytics**

1. Set up feature flags (`lib/featureFlags.ts`)
2. Integrate Umami analytics
3. Create stub pages for routes
4. Build global nav component

See `/docs/v2_implementation_order.md` for details.

---

## 🔧 Useful Commands

```bash
# Database
docker-compose up -d          # Start Postgres
docker-compose down           # Stop Postgres
docker-compose logs -f        # View logs
docker exec -it dogfinder-postgres psql -U dogfinder -d dogfinder_dev  # Connect to DB

# Migrations
npm run migrate:create <name> # Create new migration
npm run migrate:up            # Run pending migrations
npm run migrate:down          # Rollback last migration
npm run migrate -- list       # Show migration status

# Development
npm run dev                   # Start Next.js dev server
npm run typecheck             # Check TypeScript types
npm run lint                  # Run ESLint
npm run test                  # Run tests
npm run test:watch            # Watch mode for tests

# Testing
curl http://localhost:3000/api/health  # Health check
```

---

## 🐛 Troubleshooting

### "Error: connect ECONNREFUSED"
- Postgres isn't running. Run `docker-compose up -d`
- Check with `docker ps`

### "Migration already applied"
- Check status: `npm run migrate -- list`
- If you need to reapply, rollback first: `npm run migrate:down`

### "Permission denied" errors
- Check file permissions on migrations folder
- Ensure Docker has write access

### Fresh start
```bash
# Stop everything
docker-compose down -v  # -v removes volumes (deletes data)

# Start fresh
docker-compose up -d
npm run migrate:up
```

---

## 📚 Reference

- **PRD**: `/docs/v2_prd.rtf`
- **Modules**: `/docs/v2_implementation_order.md`
- **Environment**: `/docs/environment_setup.md`
- **Metrics**: `/docs/metrics.md`
- **Database Schema**: See migration file

