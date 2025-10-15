# Environment Setup - DogYenta v2

## Required Accounts & Credentials

### 1. Database (Local Postgres)
- **Setup**: Docker Compose (see docker-compose.yml)
- **Connection String**: `postgresql://dogfinder:dogfinder_dev@localhost:5432/dogfinder_dev`
- **Tools**: 
  - pgAdmin: https://www.pgadmin.org/
  - Postico (Mac): https://eggerapps.at/postico/
  - TablePlus: https://tableplus.com/

### 2. Google OAuth
- **Console**: https://console.cloud.google.com/apis/credentials
- **Create OAuth 2.0 Client ID**:
  - Application type: Web application
  - Authorized redirect URIs:
    - Local: `http://localhost:3000/api/auth/callback/google`
    - Staging: `https://staging.dogyenta.com/api/auth/callback/google`
    - Prod: `https://dogyenta.com/api/auth/callback/google`
- **Required Environment Variables**:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- **Consent Screen**: Configure with app name, support email, logo

### 3. Umami Analytics
- **Setup**: Create site at https://cloud.umami.is/ (or self-hosted)
- **Website Name**: DogYenta
- **Domain**: localhost:3000 (for dev), staging.dogyenta.com, dogyenta.com
- **Required Environment Variables**:
  - `NEXT_PUBLIC_UMAMI_SCRIPT_URL` (e.g., `https://analytics.umami.is/script.js`)
  - `NEXT_PUBLIC_UMAMI_WEBSITE_ID` (UUID from Umami dashboard)
- **Funnels to Configure** (after events are implemented):
  - Pricing → Auth → Find → Results
  - Pro intent → Checkout → Success
  - Alerts: toggle → send → click

### 4. Stripe (Module 8)
- **Dashboard**: https://dashboard.stripe.com/test (use test mode initially)
- **Create Product**:
  - Name: DogYenta Pro
  - Description: Get instant email alerts for new matching dogs
  - Price: $9.99/month (recurring)
  - Copy the Price ID
- **Webhook Endpoint**:
  - URL: `https://staging.dogyenta.com/api/stripe/webhook`
  - Events to listen for:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_failed`
  - Copy the webhook signing secret
- **Required Environment Variables**:
  - `STRIPE_SECRET_KEY` (sk_test_... for test mode)
  - `STRIPE_WEBHOOK_SECRET` (whsec_...)
  - `STRIPE_PRICE_ID` (price_...)
- **Test Cards**: https://stripe.com/docs/testing
  - Success: 4242 4242 4242 4242
  - Decline: 4000 0000 0000 0002

### 5. Resend (Module 9)
- **Dashboard**: https://resend.com/
- **Add Domain**: dogyenta.com
- **DNS Configuration** (required for deliverability):
  - SPF: Add TXT record provided by Resend
  - DKIM: Add TXT record provided by Resend
  - DMARC (optional but recommended): `v=DMARC1; p=quarantine; rua=mailto:dmarc@dogyenta.com`
- **API Key**: Create with "Sending access" permission
- **Required Environment Variables**:
  - `RESEND_API_KEY`
  - `ALERTS_FROM_EMAIL=alerts@dogyenta.com`
- **Webhook** (optional, for bounce/complaint handling):
  - URL: `https://staging.dogyenta.com/api/resend/webhook`
  - Events: `email.bounced`, `email.complained`

---

## .env.local Template

Create this file in `/frontend/.env.local`:

```bash
# Database
DATABASE_URL=postgresql://dogfinder:dogfinder_dev@localhost:5432/dogfinder_dev

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
# Generate secret with: openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Umami Analytics
NEXT_PUBLIC_UMAMI_SCRIPT_URL=
NEXT_PUBLIC_UMAMI_WEBSITE_ID=

# Feature Flags (toggle as you implement modules)
NEXT_PUBLIC_FEATURE_PRICING=false
NEXT_PUBLIC_FEATURE_AUTH=false
NEXT_PUBLIC_FEATURE_PRO=false
NEXT_PUBLIC_FEATURE_ALERTS=false
NEXT_PUBLIC_FEATURE_PAYMENTS=false

# Stripe (add in Module 8)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

# Resend (add in Module 9)
RESEND_API_KEY=
ALERTS_FROM_EMAIL=alerts@dogyenta.com

# Petfinder (existing v1 integration)
PETFINDER_API_KEY=
PETFINDER_SECRET=

# Optional: Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## Quick Start Commands

### Initial Setup

```bash
# 1. Navigate to frontend directory
cd /Users/samshap/Desktop/Dev/dogfinder-app/frontend

# 2. Install dependencies
npm install

# 3. Install migration and database packages
npm install --save-dev node-pg-migrate pg
npm install pg

# 4. Create .env.local from template
cp .env.example .env.local
# Then edit .env.local with your credentials

# 5. Generate NextAuth secret
openssl rand -base64 32
# Copy output to NEXTAUTH_SECRET in .env.local

# 6. Start Postgres
docker-compose up -d

# 7. Verify Postgres is running
docker ps
# Should see dogfinder-postgres container

# 8. Create first migration
npm run migrate:create initial-schema

# 9. Run migrations (after writing SQL)
npm run migrate:up

# 10. Start dev server
npm run dev
```

### Daily Development

```bash
# Start database
docker-compose up -d

# Start dev server
npm run dev

# In another terminal, watch tests
npm run test:watch

# Stop database when done
docker-compose down
```

### Migration Commands

```bash
# Create new migration
npm run migrate:create <migration-name>

# Run pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Rollback all migrations (careful!)
npm run migrate:down -- -1

# Check migration status
npm run migrate -- list
```

### Database Access

```bash
# Connect via psql
docker exec -it dogfinder-postgres psql -U dogfinder -d dogfinder_dev

# Or connect with GUI tool using:
# Host: localhost
# Port: 5432
# Database: dogfinder_dev
# User: dogfinder
# Password: dogfinder_dev
```

---

## Deployment (Staging)

### Environment Variables for Staging

Create these in your hosting platform (Vercel/Netlify/etc.):

```bash
# Database (use production Postgres, e.g., Supabase/Neon/Railway)
DATABASE_URL=<production-connection-string>

# NextAuth
NEXTAUTH_URL=https://staging.dogyenta.com
NEXTAUTH_SECRET=<different-from-local>

# Google OAuth (same client, add staging redirect URI)
GOOGLE_CLIENT_ID=<same>
GOOGLE_CLIENT_SECRET=<same>

# Umami (same or separate site)
NEXT_PUBLIC_UMAMI_SCRIPT_URL=<same>
NEXT_PUBLIC_UMAMI_WEBSITE_ID=<staging-site-id>

# Feature Flags (enable as you deploy)
NEXT_PUBLIC_FEATURE_PRICING=true
NEXT_PUBLIC_FEATURE_AUTH=true
NEXT_PUBLIC_FEATURE_PRO=false
NEXT_PUBLIC_FEATURE_ALERTS=false
NEXT_PUBLIC_FEATURE_PAYMENTS=false

# Stripe (use test mode keys)
STRIPE_SECRET_KEY=<test-key>
STRIPE_WEBHOOK_SECRET=<staging-webhook-secret>
STRIPE_PRICE_ID=<test-price-id>

# Resend (production keys, use staging subdomain if desired)
RESEND_API_KEY=<production-key>
ALERTS_FROM_EMAIL=alerts@staging.dogyenta.com

# Petfinder
PETFINDER_API_KEY=<same>
PETFINDER_SECRET=<same>
```

### Database Setup for Staging

```bash
# 1. Provision Postgres database (Supabase, Neon, Railway, or Render)
# 2. Get connection string
# 3. Run migrations against staging DB:

DATABASE_URL=<staging-connection-string> npm run migrate:up
```

---

## Troubleshooting

### Postgres won't start
```bash
# Check if port 5432 is already in use
lsof -i :5432

# If another Postgres is running, stop it or change port in docker-compose.yml
```

### Migrations fail
```bash
# Check connection
docker exec -it dogfinder-postgres psql -U dogfinder -d dogfinder_dev -c "SELECT 1;"

# Check migration status
npm run migrate -- list

# Reset database (careful! loses all data)
docker-compose down -v
docker-compose up -d
npm run migrate:up
```

### NextAuth errors
```bash
# Ensure NEXTAUTH_SECRET is set (32+ characters)
openssl rand -base64 32

# Ensure NEXTAUTH_URL matches your dev server
# Local: http://localhost:3000
# Staging: https://staging.dogyenta.com
```

### Umami not tracking
- Check browser console for script loading errors
- Verify `NEXT_PUBLIC_UMAMI_WEBSITE_ID` is correct (UUID format)
- Ensure Umami script is loaded in root layout
- Disable ad blockers during development

---

## Security Checklist

Before deploying to production:
- [ ] All secrets rotated from staging
- [ ] HTTPS enforced on all routes
- [ ] CSRF tokens on all mutating endpoints
- [ ] Stripe webhook signature verified
- [ ] Resend webhook signature verified (if used)
- [ ] No secrets in code or commits
- [ ] Database backups configured
- [ ] Rate limiting enabled
- [ ] Logs scrubbed of PII
- [ ] Error messages don't leak sensitive info

