# Launch Runbook – DogYenta Production Release

**Launch Window:** November 18, 2025 @ 10:00 PT  
**Leader:** Sam Shapiro (`@samshap`)  
**On-Call Engineers:**  
- Primary: Alex Rivera (`@alex`)  
- Secondary: Priya Desai (`@priya`)

---

## 1. Go/No-Go Checklist

| Item | Owner | Status |
| ---- | ----- | ------ |
| Supabase migrations applied (`npm run migrate:up`) | Alex | ☐ |
| Stripe live keys & webhook secret set (`STRIPE_MODE=live`) | Sam | ☐ |
| Resend sender domain verified | Priya | ☐ |
| Lighthouse scores ≥ target (see `docs/PERFORMANCE_ACCESSIBILITY_CHECKLIST.md`) | UX QA | ☐ |
| Analytics smoke test (`npm run analytics:smoke`) vs prod | Alex | ☐ |
| Stripe negative flow test (staging) | Priya | ☐ |
| Observability dashboards green (`docs/OBSERVABILITY_RUNBOOK.md`) | Sam | ☐ |
| Voucher codes minted & shared securely | Marketing | ☐ |

All boxes must be checked and recorded in `STAGING_TEST_RESULTS.md` before cutover.

---

## 2. Timeline (All times PT)

| Time | Action | Owner |
| ---- | ------ | ----- |
| 08:30 | Stand-up, final checklist review | All |
| 09:00 | Freeze staging branch; create release tag `v1.0.0-launch` | Sam |
| 09:15 | Backup Supabase database snapshot | Alex |
| 09:30 | Deploy staging to production (merge `staging` → `main`, trigger Vercel deploy) | Sam |
| 09:45 | Smoke tests (home, onboarding, checkout, preferences) | QA |
| 10:00 | Official go/no-go; enable marketing site updates | All |
| 10:05 | Announce launch on LinkedIn, email waitlist | Marketing |
| 10:30 | Monitor metrics (traffic, Stripe events, email sends) | On-call |
| 12:00 | Voucher performance check-in | Marketing |
| 17:00 | End-of-day retro + log review | All |

---

## 3. Deployment Steps

1. **Verify environment variables** (`vercel env pull .env.production`).
2. **Promote staging to production:**
   ```bash
   git checkout main
   git pull origin main
   git merge origin/staging
   git tag v1.0.0-launch
   git push origin main --tags
   ```
3. **Trigger Vercel production deploy** (should auto-run on push).
4. **Run smoke suite:**
   ```bash
   npm run analytics:smoke # verify UMAMI snippet
   npm run stripe:test:failures # in staging to ensure alerts still fire
   ```
5. **Verify Supabase migrations:**
   ```bash
   npm run migrate:up
   ```

---

## 4. Rollback Procedure

1. **Vercel Revert:** Use Vercel dashboard → Deployments → `Revert` to previous healthy deployment.
2. **Database Restore:** If schema changes caused issues, revert to latest Supabase snapshot:
   - Supabase Dashboard → Backups → Restore to timestamp (keep note of data loss window).
3. **Configuration Rollback:** Set `STRIPE_MODE=test` and revert `.env.production` secrets if needed.
4. **Communication:** Post status update in #launch and notify stakeholders + customers (email template in `docs/EMAIL_ALERTS_SETUP_GUIDE.md`).

---

## 5. Monitoring & Alerting

- **Vercel Alerts:** Error rate > 2% or latency > 750ms triggers PagerDuty (Primary).
- **Stripe Radar:** `invoice.payment_failed` > 3/hr posts to #billing-alerts.
- **Resend:** Bounce/complaint alerts to #email-ops.
- **Manual Checks:** Review Umami dashboard hourly for traffic spikes and conversion funnel.

Escalation order: Primary → Secondary → Sam → CTO.

---

## 6. Post-Launch Tasks (within 24h)

- [ ] Publish launch summary + metrics to leadership.
- [ ] Add voucher redemption stats to CRM.
- [ ] Close out GitHub milestone and archive completed tickets.
- [ ] Schedule retrospective (30 minutes) for week-of Nov 24.

---

## 7. Reference Documents

- `docs/STRIPE_LAUNCH_CHECKLIST.md`
- `docs/EMAIL_COMPLIANCE_CHECKLIST.md`
- `docs/OBSERVABILITY_RUNBOOK.md`
- `docs/PERFORMANCE_ACCESSIBILITY_CHECKLIST.md`
- `docs/SECURITY_HARDENING_CHECKLIST.md`
- `docs/VOUCHER_CAMPAIGN_PLAYBOOK.md`

Keep this runbook updated after each launch. Store sign-offs in `STAGING_DEPLOYMENT_SUMMARY.md`.

