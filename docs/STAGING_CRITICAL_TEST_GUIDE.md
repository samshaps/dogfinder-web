# Staging Critical Path & Edge Case Testing Guide

## 🚀 Quick Start

After deployment completes (~2-3 minutes), follow these tests in order.

---

## Test 1: Email Subject Line Format (5 min)

### Setup
1. Ensure you have a test user with:
   - Email alerts enabled
   - Preferences set (zip codes, radius, etc.)
   - Some dogs matching their preferences

### Steps
1. **Trigger email alert cron:**
   ```bash
   curl -X POST https://staging.dogyenta.com/api/cron/email-alerts \
     -H "Authorization: Bearer $CRON_SECRET_STAGING" \
     -H "Content-Type: application/json"
   ```

2. **Check cron response:**
   - Look for `"sent": 1` or `"status": "sent"` in results
   - Note the email address that received the email

3. **Check email inbox:**
   - Open the email sent to test user
   - **Verify subject line format:**
     - ✅ Single zip: `"5 new dog matches near 10001"`
     - ✅ Multiple zips: `"12 new dog matches near 10001, 10002"`
     - ✅ Many zips: `"8 new dog matches near 10001, 10002, 10003 + more"`
     - ✅ 99+ cap: `"99+ new dog matches near 10001"` (if 100+ matches)

4. **Check email preview (preheader):**
   - Hover over email in inbox (Gmail/Outlook)
   - Should show: "Based on your preferences in {ZIP_LIST}. View all or manage alerts."

### Expected Results
- ✅ Subject follows exact format
- ✅ ZIP list formatting matches rules
- ✅ Preheader visible in email client

---

## Test 2: Unsubscribe Page Loads (3 min)

### Steps
1. **Get a valid unsubscribe token:**
   - Option A: Use token from email footer (if you received one)
   - Option B: Generate test token (see below)

2. **Visit unsubscribe page:**
   ```
   https://staging.dogyenta.com/unsubscribe?token=<TOKEN>
   ```

3. **Verify page loads:**
   - ✅ Page renders (not 404)
   - ✅ Shows "Unsubscribe from Email Alerts" title
   - ✅ Shows warning card with bullet points
   - ✅ Shows unsubscribe button

### Generate Test Token (if needed)
```bash
# In your local environment, generate a token:
node -e "
const crypto = require('crypto');
const secret = process.env.EMAIL_TOKEN_SECRET;
const payload = {
  sub: 'test@example.com',
  scope: 'alerts+unsubscribe',
  jti: 'test-' + Date.now(),
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 3600)
};
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
const sig = crypto.createHmac('sha256', secret).update(header + '.' + body).digest().toString('base64url');
console.log(header + '.' + body + '.' + sig);
"
```

### Expected Results
- ✅ Page loads without errors
- ✅ UI elements render correctly
- ✅ Token validation works

---

## Test 3: Resolve Endpoint (2 min)

### Steps
1. **Test with invalid token:**
   ```bash
   curl "https://staging.dogyenta.com/api/unsubscribe/resolve?token=invalid"
   ```
   - Expected: `400` with error message

2. **Test with valid token (from email or generated):**
   ```bash
   curl "https://staging.dogyenta.com/api/unsubscribe/resolve?token=<VALID_TOKEN>"
   ```
   - Expected: `200` with JSON:
     ```json
     {
       "user_id": "...",
       "email_masked": "te**@****.com",
       "plan_status": "pro" | "free" | "pro_pending_cancel",
       "current_period_end": "2024-01-15T00:00:00Z" | null,
       "can_unsubscribe": true,
       "cancel_at_period_end": false,
       "email_enabled": true
     }
     ```

### Expected Results
- ✅ Invalid token returns 400
- ✅ Valid token returns user data
- ✅ Email is masked correctly

---

## Test 4: Unsubscribe Action - Pro User (10 min)

### Setup
1. Create a test Pro user with:
   - Active Stripe subscription (test mode)
   - Email alerts enabled
   - Current period end date in future

### Steps
1. **Get unsubscribe token for Pro user:**
   - From email or generate one

2. **Visit unsubscribe page:**
   ```
   https://staging.dogyenta.com/unsubscribe?token=<PRO_USER_TOKEN>
   ```

3. **Verify page shows Pro info:**
   - ✅ Shows period end date
   - ✅ Shows warning about cancellation at period end
   - ✅ Shows "Unsubscribe (alerts off now, cancel at period end)" button

4. **Click unsubscribe button:**
   - Wait for processing

5. **Verify success state:**
   - ✅ Shows "You're unsubscribed" title
   - ✅ Shows period end date
   - ✅ Shows "Email alerts are off" message
   - ✅ Shows "Manage subscription" link
   - ✅ Shows "Turn alerts back on" button

6. **Check database (via API or Supabase dashboard):**
   ```sql
   SELECT enabled FROM alert_settings WHERE user_id = '<USER_ID>';
   SELECT cancel_at_period_end, current_period_end FROM plans WHERE user_id = '<USER_ID>';
   ```
   - ✅ `alert_settings.enabled` = `false`
   - ✅ `plans.cancel_at_period_end` = `true`
   - ✅ `plans.current_period_end` = updated timestamp

7. **Check Stripe (Stripe Dashboard → Test Mode):**
   - Find subscription
   - ✅ `cancel_at_period_end` = `true`
   - ✅ Subscription NOT immediately cancelled (status still `active`)

### Expected Results
- ✅ Alerts disabled immediately
- ✅ Cancellation scheduled at period end
- ✅ Stripe subscription updated correctly
- ✅ Success page shows correct info

---

## Test 5: Unsubscribe Action - Free User (5 min)

### Setup
1. Create a test Free user with:
   - No Stripe subscription
   - Email alerts enabled

### Steps
1. **Get unsubscribe token for Free user**

2. **Visit unsubscribe page:**
   ```
   https://staging.dogyenta.com/unsubscribe?token=<FREE_USER_TOKEN>
   ```

3. **Click unsubscribe button**

4. **Verify success state:**
   - ✅ Shows "You're unsubscribed" title
   - ✅ Shows simplified message: "Email alerts are off."
   - ✅ No period end date shown
   - ✅ Shows "Go to Profile" link

5. **Check database:**
   ```sql
   SELECT enabled FROM alert_settings WHERE user_id = '<USER_ID>';
   ```
   - ✅ `alert_settings.enabled` = `false`

6. **Verify no Stripe calls:**
   - ✅ No Stripe API calls in logs
   - ✅ No errors related to Stripe

### Expected Results
- ✅ Alerts disabled immediately
- ✅ No Stripe subscription updates
- ✅ Simplified success message

---

## Test 6: Already Cancelled Subscription (5 min)

### Setup
1. Create a Pro user with:
   - `cancel_at_period_end` = `true`
   - `current_period_end` = future date
   - Email alerts disabled

### Steps
1. **Get unsubscribe token**

2. **Visit unsubscribe page:**
   ```
   https://staging.dogyenta.com/unsubscribe?token=<TOKEN>
   ```

3. **Verify page shows notice:**
   - ✅ Shows: "Cancellation already scheduled for {date}. Email alerts are now off."
   - ✅ No unsubscribe button (or shows different state)

### Expected Results
- ✅ Recognizes already cancelled state
- ✅ Shows appropriate message

---

## Test 7: Token Validation (5 min)

### Steps
1. **Test expired token:**
   - Create token with old expiration
   - Try to access unsubscribe page
   - ✅ Should redirect to auth or show error

2. **Test invalid token:**
   ```
   https://staging.dogyenta.com/unsubscribe?token=invalid_token_123
   ```
   - ✅ Should show error or redirect

3. **Test missing token:**
   ```
   https://staging.dogyenta.com/unsubscribe
   ```
   - ✅ Should show error message

4. **Test token reuse:**
   - Use a token that was already used
   - ✅ Should show "already used" message

### Expected Results
- ✅ Invalid tokens rejected
- ✅ Expired tokens handled
- ✅ Token reuse prevented

---

## Test 8: Matches Found Calculation (10 min)

### Setup
1. User with:
   - `last_sent_at_utc` = 2 days ago
   - `last_seen_ids` = [dog1, dog2, dog3]
   - Some new dogs available in API

### Steps
1. **Trigger email alert cron**

2. **Check cron response:**
   - Look for user in results
   - Note `matchesCount` or `status`

3. **Check email content:**
   - Open email
   - Look for: "Matches Found: {X} · showing top {Y}"
   - ✅ Should show correct count of new/updated dogs
   - ✅ Should NOT include dogs already in `last_seen_ids`

4. **Test with 0 matches:**
   - Set user with all dogs already seen
   - Trigger cron
   - ✅ Should skip send (`status: 'no_new_matches'`)
   - ✅ No email sent

### Expected Results
- ✅ Only new/updated dogs counted
- ✅ Email skipped when 0 matches
- ✅ Correct count displayed

---

## Test 9: Edge Case - Stripe API Failure (5 min)

### Setup
1. Temporarily break Stripe API (wrong key or network issue)

### Steps
1. **Attempt unsubscribe for Pro user**
2. **Verify graceful handling:**
   - ✅ Alerts still disabled
   - ✅ Error logged but not shown to user
   - ✅ Success message still shown

### Expected Results
- ✅ Partial success (alerts off even if Stripe fails)
- ✅ No error shown to user
- ✅ Error logged for debugging

---

## Test 10: Email with 100+ Matches (5 min)

### Setup
1. User with 150+ new matches

### Steps
1. **Trigger email alert cron**
2. **Check email:**
   - ✅ Subject: "99+ new dog matches near {ZIP}"
   - ✅ Body: "Matches Found: 99+ · showing top 5"
   - ✅ Only top 5 dogs shown

### Expected Results
- ✅ 99+ cap applied correctly
- ✅ Only top matches shown

---

## Quick Verification Checklist

After all tests, verify:

- [ ] Email subject format correct
- [ ] Preheader visible
- [ ] Unsubscribe page loads
- [ ] Resolve endpoint works
- [ ] Pro user unsubscribe works (alerts off + cancel scheduled)
- [ ] Free user unsubscribe works (alerts off only)
- [ ] Already cancelled state handled
- [ ] Token validation works
- [ ] Matches calculation correct
- [ ] Stripe failure handled gracefully
- [ ] 99+ cap works

---

## Troubleshooting

### Email not sending?
- Check Resend dashboard for errors
- Verify email address is verified (staging)
- Check cron job logs in Vercel

### Unsubscribe not working?
- Check Stripe API key is correct
- Verify database connection
- Check token expiration

### Page not loading?
- Check Vercel deployment status
- Verify environment variables
- Check browser console for errors

---

## Report Issues

If you find issues:
1. Note the test number
2. Describe the issue
3. Include error messages
4. Screenshot if applicable
5. Check Vercel logs for server errors

---

**Total Estimated Time: ~60 minutes**

Start with Tests 1-4 (critical path), then move to edge cases.

