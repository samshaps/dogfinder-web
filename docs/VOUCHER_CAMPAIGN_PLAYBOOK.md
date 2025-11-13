# Voucher Campaign Playbook

**Date:** November 11, 2025  
**Owner:** Growth Marketing

## 1. Decide Campaign Parameters

- Discount type: percentage (e.g. 50% off) or fixed amount (e.g. $20 off).
- Redemption window: number of days before vouchers expire.
- Quantity: number of promotion codes to mint (one redemption each).
- Prefix: memorable code prefix (e.g. `DOGYENTA`, `LAUNCH50`).
- Audience: LinkedIn followers, waitlist subscribers, or partner orgs.

## 2. Generate Voucher Codes

```bash
cd frontend
# Example: 50% off, 100 codes, 45 day expiry, live mode
STRIPE_MODE=live \
STRIPE_SECRET_KEY_LIVE=sk_live_xxx \
node scripts/create-stripe-vouchers.js \
  --type=percent \
  --value=50 \
  --quantity=100 \
  --duration=45 \
  --prefix=DOGYENTA \
  --name="DogYenta Launch 50% Off"
```

Outputs:
- Creates a Stripe coupon with matching `max_redemptions`.
- Generates `quantity` promotion codes with single-use restriction.
- CSV export saved to `frontend/scripts/voucher-exports`.

## 3. Validate in Stripe Dashboard

- Coupon appears under **Products → Coupons**.
- Promotion codes listed under **Products → Promotion codes** with `Remaining` = 1.
- Redeem one code via test checkout to confirm discount applies.

## 4. Distribution Plan

- Store CSV in secure location (e.g. Notion doc with restricted access).
- Draft LinkedIn announcement:
  - Highlight offer (e.g. “First 100 people get 50% off their first month”).
  - Include instructions: “Visit dogyenta.com/pricing and enter code DOGYENTA-XXXX at checkout.”
  - Mention expiry date and eligibility.
- Set up support macros to help customers redeem or troubleshoot.

## 5. Tracking & Follow-up

- Tag campaign using Umami event: `trackEvent('voucher_redeemed', { code, source: 'linkedin' })`.
- Monitor Stripe promotion code dashboard for remaining counts.
- Send thank-you email to redeemers with onboarding tips.
- After campaign ends, archive unused codes and optionally disable coupon in Stripe.

Document campaign metrics (codes claimed, conversion rate, MRR impact) in `STAGING_TEST_RESULTS.md` or marketing CRM.

