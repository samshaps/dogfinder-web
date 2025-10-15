# DogYenta v2 - Implementation Order & Slices

## Phase 1: Foundation (Week 1)

### Module 1: Data Layer (FIRST - everything depends on this)
**Original Module**: Module 10 in PRD  
**Priority**: MUST DO FIRST - all other modules depend on this

#### Slice 1.1: Database Setup & Migration Tooling (2-3 hrs)
- **User Story**: As a developer, I need local Postgres + migration tooling so I can persist data
- **Acceptance Criteria**:
  - [ ] Docker Compose with Postgres running locally
  - [ ] node-pg-migrate installed and configured
  - [ ] Database connection utility created
  - [ ] Health check API route (`/api/health`)
- **Test Plan**: 
  - Unit: Database connection succeeds
  - Integration: GET /api/health returns DB status
- **Observable**: Screenshot of health check returning `{"status": "ok", "db": "connected"}`
- **Estimated**: 2 hrs

#### Slice 1.2: Core Tables Migration (3-4 hrs)
- **User Story**: As a developer, I need all 6 tables created so features can persist data
- **Acceptance Criteria**:
  - [ ] Migration for `users` table
  - [ ] Migration for `plans` table with FK to users
  - [ ] Migration for `preferences` table with FK to users
  - [ ] Migration for `alert_settings` table with FK to users
  - [ ] Migration for `email_events` table with FK to users
  - [ ] Migration for `dog_cache` table
  - [ ] All FKs, indices, and constraints in place
  - [ ] Seed script with test data
- **Test Plan**:
  - Unit: Each table query works
  - Integration: API routes for reading test data
- **Observable**: Screenshot of pgAdmin/Postico showing all tables with relationships
- **Estimated**: 3 hrs

---

### Module 2: Foundations & Analytics (2-3 hrs)
**Original Module**: Module 0 in PRD

#### Slice 2.1: Routes, Feature Flags, Umami (2-3 hrs)
- **Dependencies**: None
- **User Story**: As a developer, I need routing structure and analytics so I can track user behavior
- **Acceptance Criteria**:
  - [ ] Feature flags utility (`lib/featureFlags.ts`)
  - [ ] Umami script in root layout
  - [ ] `trackEvent()` utility created
  - [ ] `/docs/metrics.md` event dictionary
  - [ ] Stub pages: `/`, `/pricing`, `/find`, `/results`, `/profile`
  - [ ] Global nav component with feature flag support
- **Test Plan**:
  - Unit: Feature flags return correct values
  - E2E: Navigate to all pages, verify pageviews in Umami
- **Observable**: Screenshot of Umami dashboard showing 5 pageviews
- **Estimated**: 2.5 hrs

---

### Module 3: Authentication (3-4 hrs)
**Original Module**: Module 2 in PRD

#### Slice 3.1: NextAuth Google OAuth (3-4 hrs)
- **Dependencies**: Module 1 (users table)
- **User Story**: As a user, I can sign in with Google so my preferences persist
- **Acceptance Criteria**:
  - [ ] NextAuth v5 configured with Google provider
  - [ ] User record created in DB on first login
  - [ ] Session persists across reloads
  - [ ] Login button in nav → opens modal
  - [ ] Avatar replaces login button when authenticated
  - [ ] Logout functionality
  - [ ] Redirect using `?next=` and `?plan=` query params
- **Test Plan**:
  - Unit: Session creation logic
  - Integration: POST /api/auth/signin creates user
  - E2E: Full login → logout flow
- **Observable**: Video of login flow + screenshot of users table with new record
- **Estimated**: 4 hrs

---

## Phase 2: Core User Flow (Week 2)

### Module 4: Public Pricing Page (2-3 hrs)
**Original Module**: Module 1 in PRD

#### Slice 4.1: Pricing Page UI (2-3 hrs)
- **Dependencies**: Module 2 (feature flags), Module 3 (auth for CTA behavior)
- **User Story**: As a visitor, I can view pricing plans so I understand the value proposition
- **Acceptance Criteria**:
  - [ ] Hero section with value prop
  - [ ] Free vs Pro comparison table
  - [ ] CTAs: Free → `/auth?plan=free`, Pro → `/auth?plan=pro`
  - [ ] Umami events: `pricing_page_viewed`, `pricing_cta_free`, `pricing_cta_pro`
  - [ ] Responsive design
- **Test Plan**:
  - E2E: Navigate to /pricing, click CTAs, verify events
- **Observable**: Screenshot of pricing page + Umami event logs
- **Estimated**: 3 hrs

---

### Module 5: /find Intake Form (3-4 hrs)
**Original Module**: Module 4 in PRD

#### Slice 5.1: Intake Form UI + Persistence (3-4 hrs)
- **Dependencies**: Module 1 (preferences table), Module 3 (auth)
- **User Story**: As a user, I can specify my dog preferences so the system finds matches
- **Acceptance Criteria**:
  - [ ] Required fields: location, radius
  - [ ] Optional: age, size, breed, lifestyle
  - [ ] Form validation
  - [ ] Autosave for signed-in users → `preferences` table
  - [ ] Submit → `/results`
  - [ ] Umami events: `find_started`, `find_location_set`, `find_preferences_saved`, `find_submitted`
- **Test Plan**:
  - Unit: Validation logic
  - Integration: POST /api/preferences saves correctly
  - E2E: Complete form → see data in DB
- **Observable**: Screenshot of form + DB record
- **Estimated**: 4 hrs

---

### Module 6: /results (Plan-aware UI) (3-4 hrs)
**Original Module**: Module 5 in PRD

#### Slice 6.1: Results Page with Alert Controls (3-4 hrs)
- **Dependencies**: Module 1 (alert_settings table), Module 3 (auth)
- **User Story**: As a user, I can view matched dogs and manage alert preferences
- **Acceptance Criteria**:
  - [ ] Display dogs (use existing matching logic initially)
  - [ ] Alert toolbar: toggle + cadence selector (daily/weekly)
  - [ ] Free users: disabled toggle + "Upgrade to Pro" CTA
  - [ ] Pro users: functional toggle + cadence selector
  - [ ] Settings persist to `alert_settings` table
  - [ ] Umami events: `results_viewed`, `results_dog_clicked`, `results_alert_toggled`
- **Test Plan**:
  - Unit: Alert settings logic
  - Integration: PATCH /api/alerts updates DB
  - E2E: Toggle alerts → verify DB
- **Observable**: Screenshot of results page (Free vs Pro views)
- **Estimated**: 4 hrs

---

### Module 7: Profile & Plan Management (3-4 hrs)
**Original Module**: Module 3 in PRD

#### Slice 7.1: Profile Page UI (3-4 hrs)
- **Dependencies**: Module 1 (plans table), Module 3 (auth)
- **User Story**: As a user, I can view my profile and manage my subscription
- **Acceptance Criteria**:
  - [ ] Auth-guarded route
  - [ ] Display: email, avatar, plan tier
  - [ ] Plan card: current plan, upgrade/downgrade CTA
  - [ ] Alert controls section
  - [ ] Logout button
  - [ ] Pro users: "Deactivate Pro" button (modal confirmation)
  - [ ] Umami events: `profile_viewed`, `profile_plan_changed`
- **Test Plan**:
  - E2E: Navigate to /profile, verify plan display
- **Observable**: Screenshot of profile page
- **Estimated**: 3.5 hrs

---

## Phase 3: Monetization (Week 3)

### Module 8: Payments & Plan Lifecycle (4-5 hrs)
**Original Module**: Module 7 in PRD

#### Slice 8.1: Stripe Checkout Integration (2-3 hrs)
- **Dependencies**: Module 1 (plans table), Module 7 (profile page)
- **User Story**: As a user, I can upgrade to Pro so I get email alerts
- **Acceptance Criteria**:
  - [ ] `/api/stripe/checkout` creates checkout session
  - [ ] Success URL → `/profile?success=true`
  - [ ] Cancel URL → `/pricing?canceled=true`
  - [ ] User linked to Stripe customer ID in DB
  - [ ] Umami events: `checkout_initiated`, `checkout_success`, `checkout_canceled`
- **Test Plan**:
  - Integration: Stripe checkout session created
  - E2E: Complete test payment → verify plan updated
- **Observable**: Screenshot of Stripe checkout + updated DB record
- **Estimated**: 3 hrs

#### Slice 8.2: Stripe Webhooks & State Machine (2-3 hrs)
- **Dependencies**: Slice 8.1
- **User Story**: As the system, I need to handle subscription lifecycle events
- **Acceptance Criteria**:
  - [ ] `/api/stripe/webhook` endpoint with signature verification
  - [ ] Handle events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  - [ ] Plan state machine: `free` → `pro_active` → `pro_past_due` → `pro_canceled_effective`
  - [ ] Idempotency check via `email_events` table
  - [ ] Disable alerts on downgrade
- **Test Plan**:
  - Integration: Mock webhook events update plan correctly
  - E2E: Use Stripe CLI to send test webhooks
- **Observable**: Logs showing webhook processing + DB state changes
- **Estimated**: 2.5 hrs

---

### Module 9: Alerts Backend & Email (4-6 hrs)
**Original Module**: Module 6 in PRD

#### Slice 9.1: Alert Settings CRUD API (1-2 hrs)
- **Dependencies**: Module 1 (alert_settings table), Module 6 (results page)
- **User Story**: As a Pro user, I can manage my alert preferences via API
- **Acceptance Criteria**:
  - [ ] GET /api/alerts - fetch user's settings
  - [ ] PATCH /api/alerts - update enabled/cadence
  - [ ] POST /api/alerts/unsubscribe - disable alerts (public, signed URL)
  - [ ] Plan check: only Pro users can enable
- **Test Plan**:
  - Integration: All CRUD operations work
  - Unit: Plan validation logic
- **Observable**: Postman/curl screenshots of API responses
- **Estimated**: 1.5 hrs

#### Slice 9.2: Email Engine & Resend Integration (3-4 hrs)
- **Dependencies**: Slice 9.1, Module 1 (dog_cache table)
- **User Story**: As a Pro user, I receive email alerts when new matching dogs are posted
- **Acceptance Criteria**:
  - [ ] Resend integration (`lib/email.ts`)
  - [ ] Email template (React Email or HTML)
  - [ ] Query new dogs from `dog_cache` since `last_sent_at_utc`
  - [ ] Cron job/API route for daily/weekly sends
  - [ ] Footer links: "Pause alerts", "Manage subscription"
  - [ ] Update `last_sent_at_utc` and `last_seen_ids` post-send
  - [ ] Log to `email_events` table
  - [ ] Umami events: `alert_email_sent`, `alert_email_clicked`
- **Test Plan**:
  - Integration: Send test email
  - E2E: Trigger alert flow → receive email → click links
- **Observable**: Screenshot of received email + email_events DB records
- **Estimated**: 4 hrs

---

## Phase 4: Polish (Week 4)

### Module 10: Analytics Dashboard (2 hrs)
**Original Module**: Module 8 in PRD

#### Slice 10.1: Umami Funnels & Reporting (2 hrs)
- **Dependencies**: All previous modules (events must be firing)
- **User Story**: As a product owner, I can track conversion funnels
- **Acceptance Criteria**:
  - [ ] Finalize event typings in `lib/analytics/types.ts`
  - [ ] Configure Umami funnels:
    - Pricing → Auth → Find → Results
    - Pro intent → Checkout → Success
    - Alerts: toggle → send → click
  - [ ] Verify no PII in events
- **Test Plan**:
  - Manual: Run through all flows, verify events in Umami
- **Observable**: Screenshot of Umami dashboard with funnels
- **Estimated**: 2 hrs

---

### Module 11: Hardening & QA (4-6 hrs)
**Original Module**: Module 9 in PRD

#### Slice 11.1: Security & Error Handling (2-3 hrs)
- **User Story**: As a user, my data is secure and errors are handled gracefully
- **Acceptance Criteria**:
  - [ ] HTTPS enforced in production
  - [ ] CSRF middleware on all POST/PATCH/DELETE routes
  - [ ] Stripe webhook signature verification
  - [ ] Resend webhook signature verification (if using)
  - [ ] Structured logging utility (`lib/logger.ts`)
  - [ ] PII sanitization in logs and analytics
  - [ ] Error boundaries on all pages
- **Test Plan**:
  - Security: Attempt CSRF, invalid webhooks
  - Unit: Logger sanitization tests
- **Observable**: Security audit checklist completed
- **Estimated**: 2.5 hrs

#### Slice 11.2: Polish & Accessibility (2-3 hrs)
- **User Story**: As any user, the app is accessible and handles edge cases
- **Acceptance Criteria**:
  - [ ] Empty states: no matches, no preferences
  - [ ] Error states: network errors, API failures
  - [ ] Loading states: skeletons for all async content
  - [ ] Accessibility: Lighthouse score ≥ 90
  - [ ] SEO: meta tags, structured data
  - [ ] Privacy & Terms links in footer
- **Test Plan**:
  - Manual: Test all edge cases
  - Automated: Lighthouse CI
- **Observable**: Lighthouse report + screenshot of empty/error states
- **Estimated**: 3 hrs

---

## Deployment Checklist

### Staging (https://staging.dogyenta.com/)
- [ ] Environment variables configured
- [ ] Database provisioned and migrated
- [ ] Stripe webhook endpoint configured
- [ ] Resend domain verified (SPF/DKIM)
- [ ] Google OAuth redirect URIs added
- [ ] Umami tracking verified

### Production
- [ ] Same as staging
- [ ] Database backups configured (daily, 30-day retention)
- [ ] Secrets rotated from staging
- [ ] Rate limiting enabled
- [ ] Monitoring/alerting configured

---

## Total Estimated Time
- **Phase 1 (Foundation)**: ~12-14 hrs
- **Phase 2 (Core Flow)**: ~12-15 hrs
- **Phase 3 (Monetization)**: ~10-13 hrs
- **Phase 4 (Polish)**: ~6-8 hrs
- **Total**: ~40-50 hrs (2-3 weeks at 20 hrs/week)

