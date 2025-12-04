# Security Hardening Checklist

**Date:** November 11, 2025  
**Owner:** Security Engineering

## 1. Configuration

- [ ] Confirm `Content-Security-Policy` headers deployed (see `middleware.ts`).
- [ ] Ensure `Strict-Transport-Security` includes `preload` and domain is submitted to HSTS preload list.
- [ ] Verify Vercel project disables `x-powered-by` header.
- [ ] Set `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `CRON_SECRET_*` in production.

## 2. Secret Management

- [ ] Rotate Supabase service role key post-staging launch.
- [ ] Validate no secrets appear in build output (`grep -R "sk_" .next`).
- [ ] Enable Vercel environment protection (two-person rule for changes).

## 3. Dependency Hygiene

- [ ] Run `npm audit --production` weekly; remediate or suppress findings.
- [ ] Track advisories in `docs/SECURITY_AUDIT.md`.
- [ ] Lock OpenAI/Stripe SDK versions to prevent breaking changes (`package.json` caret versions ok for now).

## 4. Application Controls

- [ ] RLS enforced across core tables (`frontend/migrations/1760029096432_enable_rls.sql`).
- [ ] Rate limiting enabled for API routes (see `/app/rate-limit`).
- [ ] Telemetry sanitizes PII prior to sending analytics (`lib/analytics/sanitize.ts`).

## 5. Testing

- [ ] Execute automated tests: `npm run check` + `npm test`.
- [ ] Manual penetration smoke: 
  - Auth bypass attempts
  - Force downgrade billing
  - Enumerate unsubscribe tokens
- [ ] Document findings in `STAGING_TEST_RESULTS.md`.

## 6. Monitoring & Response

- [ ] Confirm 5xx alert to on-call (PagerDuty/Slack).
- [ ] Forward Stripe webhook failures to #billing-alerts.
- [ ] Run `npm run stripe:test:failures` after every billing change.

Revisit this checklist monthly or after large feature launches.

