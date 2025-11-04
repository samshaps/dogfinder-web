# Email Alerts & Unsubscribe Testing Plan v2

## Overview
This test plan covers the new email alerts improvements and single-path unsubscribe flow implemented for staging deployment.

## Pre-Deployment Checklist

- [ ] Verify all environment variables are set:
  - `EMAIL_TOKEN_SECRET`
  - `RESEND_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `CRON_SECRET_STAGING`
- [ ] Database migrations applied (verify `cancel_at_period_end` exists in `plans` table)
- [ ] Stripe webhook endpoint configured for staging
- [ ] Test email address verified in Resend dashboard (for staging)

---

## 1. Email Subject Line & Formatting

### Test 1.1: Subject Line Format
**Goal:** Verify subject line follows "{X} new dog matches near {ZIP_LIST}" format

**Steps:**
1. Trigger email alert cron job for a user with matches
2. Check email subject line

**Expected Results:**
- Subject: `"5 new dog matches near 10001"` (single zip)
- Subject: `"12 new dog matches near 10001, 10002"` (2-3 zips, comma-separated)
- Subject: `"8 new dog matches near 10001, 10002, 10003 + more"` (>3 zips, first 3 + "+ more")
- Numbers capped at "99+" if >= 99 matches

**Test Data:**
- User with 1 zip code
- User with 2-3 zip codes
- User with 5+ zip codes
- User with 100+ matches (should show "99+")

---

### Test 1.2: Preheader Text
**Goal:** Verify preheader appears in email preview

**Steps:**
1. Check email in email client (Gmail, Outlook, etc.)
2. Look for preheader text in preview

**Expected Results:**
- Preheader: "Based on your preferences in {ZIP_LIST}. View all or manage alerts."
- ZIP_LIST formatting matches subject line rules

---

## 2. Matches Found Calculation

### Test 2.1: New Dogs Since Last Send
**Goal:** Verify only new/updated dogs are counted

**Setup:**
- User with `last_sent_at_utc` = 2 days ago
- User with `last_seen_ids` = [dog1, dog2, dog3]

**Steps:**
1. Add new dogs to Petfinder API response (dog4, dog5)
2. Update existing dog (dog2) with new `published_at` > last_sent_at
3. Trigger email alert cron
4. Check email for "Matches Found" count

**Expected Results:**
- `matches_found_total` = count of new dogs + updated dogs
- Email shows: "Matches Found: {count} · showing top {shown}"
- Display capped at "99+"

---

### Test 2.2: Skip Send When No Matches
**Goal:** Verify email is NOT sent when matches_found_total == 0

**Setup:**
- User with `last_sent_at_utc` = 1 day ago
- All dogs in response are already in `last_seen_ids`
- No dogs have `published_at` > last_sent_at

**Steps:**
1. Trigger email alert cron
2. Check cron job results
3. Verify no email was sent

**Expected Results:**
- Cron job result shows `status: 'no_new_matches'`
- No email sent to user
- `last_sent_at_utc` NOT updated

---

### Test 2.3: First-Time User (No last_sent_at)
**Goal:** Verify 7-day lookback window for users without last_sent_at

**Setup:**
- User with `last_sent_at_utc` = NULL
- Dogs with `published_at` ranging from 1 day ago to 10 days ago

**Steps:**
1. Trigger email alert cron
2. Check matches count

**Expected Results:**
- Only dogs with `published_at` > 7 days ago are included
- `matches_found_total` counts only recent dogs

---

### Test 2.4: De-duplication
**Goal:** Verify dogs are de-duped by source ID

**Setup:**
- API returns duplicate dogs (same `id`)

**Steps:**
1. Trigger email alert with duplicate dogs in response
2. Check matches count

**Expected Results:**
- Each unique dog ID counted only once
- `matches_found_total` = unique count

---

## 3. Email Content Display

### Test 3.1: Matches Found Display
**Goal:** Verify "Matches Found" text in email body

**Steps:**
1. Send email with known match counts
2. Check email HTML body

**Expected Results:**
- Shows: "Matches Found: {total} · showing top {shown}"
- Total matches capped at "99+" if >= 99
- Matches shown (default 5) <= total matches

---

### Test 3.2: Footer Links
**Goal:** Verify unsubscribe and manage preferences links

**Steps:**
1. Check email footer
2. Click both links

**Expected Results:**
- "Manage preferences" → `/profile`
- "Unsubscribe" → `/unsubscribe?token=<jwt>` (valid token)
- Token has scope `alerts+unsubscribe`
- Token is valid and not expired

---

## 4. Unsubscribe Flow - Single Path

### Test 4.1: Unsubscribe Page - Token Validation
**Goal:** Verify token validation and redirect

**Steps:**
1. Access `/unsubscribe?token=<invalid_token>`
2. Access `/unsubscribe?token=<expired_token>`
3. Access `/unsubscribe` (no token)

**Expected Results:**
- Invalid token → redirect to `/auth/signin?redirect=/unsubscribe?token=...`
- Expired token → redirect to auth
- No token → show error message

---

### Test 4.2: Unsubscribe Page - Resolve Data
**Goal:** Verify resolve endpoint returns correct data

**Steps:**
1. Access `/unsubscribe?token=<valid_token>`
2. Check page loads resolve data
3. Verify displayed information

**Expected Results:**
- Page shows masked email (if token user ≠ session user)
- Shows plan status (free/pro/pro_pending_cancel)
- Shows current_period_end date (if Pro)
- Shows cancel_at_period_end status

---

### Test 4.3: Unsubscribe Action - Pro User
**Goal:** Verify single unsubscribe action works for Pro users

**Setup:**
- User with Pro plan and active Stripe subscription
- `current_period_end` = 30 days from now

**Steps:**
1. Click "Unsubscribe (alerts off now, cancel at period end)" button
2. Wait for API response
3. Check database state
4. Check Stripe subscription state

**Expected Results:**
- `alert_settings.enabled` = false (immediately)
- `plans.cancel_at_period_end` = true
- `plans.current_period_end` = updated from Stripe
- Stripe subscription: `cancel_at_period_end` = true
- Stripe subscription: NOT immediately cancelled
- Success page shows period end date
- Success page shows "alerts are off" message

---

### Test 4.4: Unsubscribe Action - Free User
**Goal:** Verify unsubscribe works for Free users

**Setup:**
- User with Free plan (no Stripe subscription)

**Steps:**
1. Click unsubscribe button
2. Check database state

**Expected Results:**
- `alert_settings.enabled` = false
- No Stripe API calls made
- Success page shows: "Email alerts are off." (no period end info)

---

### Test 4.5: Already Cancelled Subscription
**Goal:** Verify UI for users with already scheduled cancellation

**Setup:**
- User with `cancel_at_period_end` = true
- `current_period_end` = 15 days from now

**Steps:**
1. Access unsubscribe page
2. Check displayed message

**Expected Results:**
- Shows notice: "Cancellation already scheduled for {date}. Email alerts are now off."
- No unsubscribe button shown (or shows different state)

---

### Test 4.6: Success State
**Goal:** Verify success state after unsubscribe

**Steps:**
1. Complete unsubscribe action
2. Check success page content

**Expected Results:**
- Title: "You're unsubscribed"
- Message shows period end date (if Pro)
- "Manage subscription" → `/profile#billing`
- "Turn alerts back on" button (if they change mind)
- Free users see simplified message

---

### Test 4.7: Token User ≠ Session User
**Goal:** Verify masked email banner when token user differs

**Setup:**
- User A logged in
- Unsubscribe token for User B

**Steps:**
1. Access unsubscribe page with User B's token while logged in as User A
2. Check displayed email banner

**Expected Results:**
- Shows masked email banner: "Changes applied to s**@****.com"
- Processes unsubscribe for token user (User B), not session user

---

### Test 4.8: Token Reuse Protection
**Goal:** Verify token can't be used twice

**Steps:**
1. Use unsubscribe token successfully
2. Try to use same token again

**Expected Results:**
- Second attempt returns error: "This unsubscribe link has already been used"
- No duplicate unsubscribe actions

---

## 5. Edge Cases

### Test 5.1: Stripe API Failure
**Goal:** Verify graceful handling when Stripe update fails

**Setup:**
- Mock Stripe API to return error
- Pro user with active subscription

**Steps:**
1. Attempt unsubscribe
2. Check database state

**Expected Results:**
- `alert_settings.enabled` = false (alerts still turned off)
- Error logged but not thrown to user
- User sees success message (alerts are off, even if Stripe update failed)

---

### Test 5.2: Multiple Unsubscribe Attempts
**Goal:** Verify idempotency

**Steps:**
1. Click unsubscribe button multiple times rapidly
2. Check database state

**Expected Results:**
- Only one unsubscribe action processed
- Token jti marked as consumed
- Subsequent attempts return "already used" message

---

### Test 5.3: Email with 0 Matches
**Goal:** Verify email is not sent when no matches

**Steps:**
1. Set up user with preferences that match 0 dogs
2. Trigger email alert cron
3. Check results

**Expected Results:**
- Cron job skips user
- Status: `no_matches` or `no_new_matches`
- No email sent

---

### Test 5.4: Email with 100+ Matches
**Goal:** Verify 99+ cap in display

**Steps:**
1. Set up user with 150 new matches
2. Trigger email alert cron
3. Check email content

**Expected Results:**
- Subject: "99+ new dog matches near {ZIP}"
- Email body: "Matches Found: 99+ · showing top 5"
- Only top 5 dogs shown in email

---

## 6. Integration Testing

### Test 6.1: Full Email Flow
**Goal:** End-to-end test of email alert → unsubscribe flow

**Steps:**
1. User receives email alert
2. Click unsubscribe link in email footer
3. Complete unsubscribe action
4. Verify no more emails sent to user

**Expected Results:**
- Email received with correct subject/formatting
- Unsubscribe link works
- Unsubscribe action completes successfully
- Next cron job skips user (no email sent)

---

### Test 6.2: Stripe Webhook Integration
**Goal:** Verify Stripe webhook updates DB when period ends

**Setup:**
- User with `cancel_at_period_end` = true
- Simulate Stripe subscription period end

**Steps:**
1. Send Stripe webhook event: `customer.subscription.deleted`
2. Check database state

**Expected Results:**
- `plans.plan_type` = 'free'
- `plans.status` = 'cancelled'
- `plans.cancel_at_period_end` = false (or null)

---

## 7. Performance Testing

### Test 7.1: Cron Job Performance
**Goal:** Verify cron job handles multiple users efficiently

**Steps:**
1. Set up 50+ users with enabled alerts
2. Trigger email alert cron
3. Monitor execution time and errors

**Expected Results:**
- All users processed within reasonable time
- No memory leaks
- Errors logged but don't block other users
- Rate limiting respected

---

## 8. Security Testing

### Test 8.1: Token Validation
**Goal:** Verify tokens can't be tampered with

**Steps:**
1. Modify token signature
2. Try to use modified token

**Expected Results:**
- Invalid token rejected
- Error: "Invalid unsubscribe token"

---

### Test 8.2: Token Expiration
**Goal:** Verify tokens expire after 7 days

**Steps:**
1. Create token with old expiration
2. Try to use expired token

**Expected Results:**
- Expired token rejected
- Error: "This unsubscribe link has expired"
- Redirect to auth page

---

## Test Execution Checklist

### Pre-Testing
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Test users created (Free, Pro, Pro with cancellation scheduled)
- [ ] Test Stripe subscriptions created (test mode)
- [ ] Resend test email verified

### Core Functionality
- [ ] Email subject line formatting (all ZIP list scenarios)
- [ ] Preheader text display
- [ ] Matches found calculation (new/updated dogs)
- [ ] Skip send when no matches
- [ ] De-duplication by source ID
- [ ] Email content display (matches found, footer links)

### Unsubscribe Flow
- [ ] Token validation and redirects
- [ ] Resolve endpoint data
- [ ] Unsubscribe action (Pro user)
- [ ] Unsubscribe action (Free user)
- [ ] Already cancelled subscription UI
- [ ] Success state display
- [ ] Token reuse protection
- [ ] Masked email banner (token user ≠ session user)

### Edge Cases
- [ ] Stripe API failure handling
- [ ] Multiple unsubscribe attempts (idempotency)
- [ ] Email with 0 matches
- [ ] Email with 100+ matches (99+ cap)

### Integration
- [ ] Full email → unsubscribe flow
- [ ] Stripe webhook integration

### Performance & Security
- [ ] Cron job performance (multiple users)
- [ ] Token validation and expiration

---

## Rollback Plan

If critical issues are found:

1. **Revert email service changes:**
   - Restore old subject line format
   - Restore old unsubscribe URL format

2. **Revert unsubscribe API:**
   - Restore immediate cancellation logic
   - Keep both scopes for backward compatibility

3. **Database:**
   - No schema changes needed (all fields already exist)
   - No data migration required

4. **Monitoring:**
   - Watch error logs for Stripe API failures
   - Monitor unsubscribe success rate
   - Check email delivery rates

---

## Success Criteria

✅ All tests pass
✅ No critical bugs
✅ Email delivery rate > 95%
✅ Unsubscribe success rate > 99%
✅ No Stripe API errors
✅ No database errors
✅ Performance acceptable (< 5s per user in cron job)

---

## Notes

- Test with real email addresses to verify formatting in actual clients
- Use Stripe test mode for subscription testing
- Monitor error logs during testing
- Document any issues found for follow-up fixes

