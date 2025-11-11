# Stripe Launch Checklist

**Date:** November 11, 2025  
**Owner:** Billing / Growth

This checklist ensures Stripe is correctly configured when promoting staging changes to production and that negative payment scenarios remain covered.

## 1. Switch Environment Variables to Live Mode

- [ ] Update deployment platform (Vercel, Railway, etc.) with:
  - `STRIPE_MODE=live`
  - `STRIPE_SECRET_KEY_LIVE`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE`
  - `STRIPE_WEBHOOK_SECRET_LIVE`
  - `STRIPE_PRO_PRICE_ID_LIVE`
- [ ] Keep test values populated (`*_TEST`) for staging and local development.
- [ ] Rotate any legacy `STRIPE_SECRET_KEY` variables; leave unset once live keys are active.
- [ ] Re-deploy production after variables propagate.

## 2. Reconfigure Stripe Webhooks

- [ ] In Stripe dashboard, add production endpoint `https://dogyenta.com/api/stripe/webhook`.
- [ ] Subscribe to events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`.
- [ ] Copy the live webhook signing secret into `STRIPE_WEBHOOK_SECRET_LIVE`.
- [ ] Remove or disable stale staging endpoints tied to production URL.

## 3. Validate Positive Flows

- [ ] Run a $1.00 live checkout using a personal card (refund immediately after verification).
- [ ] Confirm:
  - Checkout session completes.
  - `plans` table updates to PRO with live Stripe customer + subscription IDs.
  - Confirmation email is delivered with live branding.
  - Billing portal link works for the live customer.

## 4. Exercise Negative Payment Paths (Test Mode)

Perform these in **test mode** (staging) before launch to ensure handlers and alerts remain healthy.

- [ ] Ensure `STRIPE_MODE=test` locally and set `STRIPE_SECRET_KEY_TEST`.
- [ ] Run `npm run stripe:test:failures` from the `frontend` directory.
  - Confirms `invoice.payment_failed` webhook fires.
  - Logs failed payment intent and subscription ID for traceability.
- [ ] From Stripe CLI, trigger additional scenarios:
  ```bash
  stripe trigger invoice.payment_failed
  stripe trigger customer.subscription.deleted
  stripe trigger charge.dispute.created
  ```
- [ ] Verify application responses:
  - Support tickets / alerts created (if configured).
  - User is emailed about payment failure.
  - `plans` table reflects downgraded status when failure persists.

## 5. Live Mode Smoke Tests

- [ ] After flipping `STRIPE_MODE=live`, trigger a manual invoice retry on an intentionally failed subscription to ensure alerts are suppressed in production.
- [ ] Confirm webhook logs show `livemode=true` events.
- [ ] Validate no test events reach production databases.

## 6. Post-Launch Monitoring

- [ ] Add billing metrics to observability dashboard (subscription conversions, payment failure rates).
- [ ] Enable Stripe Radar alerts to Slack/email for `invoice.payment_failed`.
- [ ] Schedule weekly review of disputes and refunds.

Document outcomes in `STAGING_TEST_RESULTS.md` (for test mode) and `STAGING_DEPLOYMENT_SUMMARY.md` (for production go-live).

