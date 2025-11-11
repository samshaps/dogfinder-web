# Observability & Analytics Runbook

**Date:** November 11, 2025  
**Owner:** Platform Engineering

This runbook covers day-one observability tasks for the DogYenta launch.

## 1. Telemetry Inventory

| Layer | Tooling | Notes |
| ----- | ------- | ----- |
| Web analytics | Umami Cloud | Script injected via `NEXT_PUBLIC_UMAMI_*` |
| API/runtime logs | Vercel Function Logs | Structured JSON with `requestId` per handler |
| Database events | Supabase `email_events`, `webhook_events` tables | Stores email + Stripe webhook history |
| Billing | Stripe Dashboard | Monitor payment success/failure funnels |

## 2. Pre-Launch Checks

- [ ] Confirm `NEXT_PUBLIC_UMAMI_SCRIPT_URL` & `NEXT_PUBLIC_UMAMI_WEBSITE_ID` populated in all environments.
- [ ] Run `npm run analytics:smoke` targeting production URL (set `ANALYTICS_SMOKE_URL=https://dogyenta.com`).
- [ ] Use browser devtools to verify `window.umami.track` executes on `pagechange`.
- [ ] Ensure Supabase `webhook_events` logging table contains recent entries from staging.
- [ ] Validate Vercel alert routing (error rate, latency, cold-start) to Slack / PagerDuty.

## 3. Alert Thresholds

| Metric | Threshold | Escalation |
| ------ | --------- | ---------- |
| API p95 latency | > 750ms for 5 minutes | PagerDuty (low) |
| 5xx rate | > 2% for 3 minutes | PagerDuty (high) |
| Stripe `invoice.payment_failed` | ≥ 3 per hour | Email Ops + Billing Slack |
| Email `alert_failed` events | ≥ 5 per send window | Email Team Slack |

Document thresholds in monitoring tool and ensure on-call rotation is subscribed to alerts.

## 4. Synthetic & Manual Tests

1. **API heartbeat**: `curl https://dogyenta.com/api/health` every 5 minutes (Vercel cron or external monitor).
2. **Stripe negative flow**: `npm run stripe:test:failures` in staging before each deploy (see `docs/STRIPE_LAUNCH_CHECKLIST.md`).
3. **Email pipeline**: Trigger `/api/cron/email-alerts` in staging, verify `email_events` entries.
4. **Analytics**: Record at least one manual conversion in Umami dashboard after deploy.

## 5. Incident Response

- Central log source: Vercel function logs (filter by `requestId` from error responses).
- Database context: Query Supabase `webhook_events` and `email_events` by `created_at DESC`.
- Customer impact audit: Check Stripe’s dashboard for failed payments and refund timeline.
- Post-incident: Document root cause in `docs/STAGING_TEST_RESULTS.md` or retro doc.

## 6. Dashboard Links

- Umami: `https://cloud.umami.is/share/dogyenta`
- Vercel Analytics: `https://vercel.com/dogyenta/analytics`
- Stripe Radar: `https://dashboard.stripe.com/radar`
- Resend Logs: `https://resend.com/app/logs`

Update this runbook as instrumentation evolves. Always record validation steps ahead of major marketing pushes.

