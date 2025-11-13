# Email Alerts Unsubscribe Feature - Staging Test Plan

## 🚀 Deployment to Staging

### Pre-Deployment Checklist

1. **Code Review**
   - [ ] All changes committed to `staging` branch
   - [ ] No console.log statements with sensitive data
   - [ ] All TypeScript types are correct
   - [ ] No linter errors

2. **Environment Variables**
   Ensure these are set in Vercel staging environment:
   - [ ] `EMAIL_TOKEN_SECRET` - JWT secret for unsubscribe tokens
   - [ ] `CRON_SECRET_STAGING` - For email alerts cron job
- [ ] `STRIPE_SECRET_KEY_TEST` - Stripe test mode key for staging
   - [ ] `RESEND_API_KEY` - For sending emails
   - `NEXT_PUBLIC_BASE_URL` or `VERCEL_URL` - For generating unsubscribe URLs

3. **Database Schema**
   - [ ] Verify `plans.cancel_at_period_end` column exists
   - [ ] Verify `plans.current_period_end` column exists
   - [ ] Verify `alert_settings.enabled` column exists (used as `email_enabled`)
   - [ ] Verify `plans.status` supports `'pro_pending_cancel'` value

4. **Deploy to Staging**
   ```bash
   # Push to staging branch (auto-deploys via Vercel)
   git push origin staging
   ```
   
   Or manually deploy via Vercel dashboard:
   - Go to Vercel project
   - Select staging environment
   - Click "Deploy"

---

## 🧪 Testing Instructions

### Test Environment Setup

**Staging URL**: `https://staging.dogyenta.com` (or your staging domain)

**Prerequisites**:
- Test user account with Pro subscription (or ability to create one)
- Access to test email inbox
- Stripe test mode dashboard access
- Database access (optional, for verification)

---

## Test Suite 1: Email Subject & Preheader

### Test 1.1: Subject Line Format - Single ZIP
**Steps**:
1. Ensure test user has preferences with single ZIP code (e.g., "10001")
2. Trigger email alert (via cron or manual trigger)
3. Check email inbox

**Expected**:
- Subject: `"5 new dog matches near 10001"` (or similar count)
- Preheader visible in email client preview: `"Based on your preferences in 10001. View all or manage alerts."`

**Verification**:
- [ ] Subject shows count (capped at 99+)
- [ ] Single ZIP displayed correctly
- [ ] Preheader text appears in email preview

---

### Test 1.2: Subject Line Format - Multiple ZIPs (2-3)
**Steps**:
1. Update test user preferences to have 2-3 ZIP codes
2. Trigger email alert

**Expected**:
- Subject: `"5 new dog matches near 10001, 10002, 10003"`
- Preheader: `"Based on your preferences in 10001, 10002, 10003. View all or manage alerts."`

**Verification**:
- [ ] ZIPs comma-separated
- [ ] All ZIPs shown

---

### Test 1.3: Subject Line Format - Many ZIPs (>3)
**Steps**:
1. Update test user preferences to have >3 ZIP codes (e.g., 5 ZIPs)
2. Trigger email alert

**Expected**:
- Subject: `"5 new dog matches near 10001, 10002, 10003 + more"`
- Preheader shows first 3 + "+ more"

**Verification**:
- [ ] First 3 ZIPs shown
- [ ] "+ more" suffix present
- [ ] Preheader matches format

---

### Test 1.4: Match Count Display
**Steps**:
1. Create scenario with >99 matches (or check existing)
2. Trigger email alert

**Expected**:
- Subject: `"99+ new dog matches near {ZIP_LIST}"`
- Email body shows: `"Matches Found: 99+ · showing top 5"`

**Verification**:
- [ ] Count capped at 99+ in subject
- [ ] Email body shows 99+ format
- [ ] Actual count in email matches total

---

## Test Suite 2: Matches Found Calculation

### Test 2.1: Skip Send When No Matches
**Steps**:
1. Set user preferences to very restrictive criteria (unlikely to match)
2. Trigger email alert cron job
3. Check logs and email inbox

**Expected**:
- No email sent
- Log shows: `"No new or updated matches found (matches_found_total: 0)"`
- Status in cron response: `"no_new_matches"`

**Verification**:
- [ ] No email received
- [ ] Cron job completes without error
- [ ] Logs indicate skip reason

---

### Test 2.2: Count New Dogs Since Last Send
**Steps**:
1. Set up user with `last_sent_at_utc` set to yesterday
2. Ensure new dogs matching preferences exist
3. Trigger email alert

**Expected**:
- Email sent with only new dogs (not in `last_seen_ids`)
- Subject shows correct count of new matches
- Email body shows: `"Matches Found: {count} · showing top 5"`

**Verification**:
- [ ] Count matches new dogs only
- [ ] Display format correct
- [ ] Dogs shown are actually new

---

### Test 2.3: Count Updated Dogs
**Steps**:
1. Set up user with `last_sent_at_utc` set to last week
2. Ensure a dog that was in `last_seen_ids` has been updated (new `published_at`)
3. Trigger email alert

**Expected**:
- Updated dog included in count
- Email shows updated dog

**Verification**:
- [ ] Updated dogs counted
- [ ] Updated dogs appear in email

---

### Test 2.4: De-duplication by Source ID
**Steps**:
1. Create scenario where same dog appears multiple times in API response
2. Trigger email alert

**Expected**:
- Dog appears only once in email
- Count reflects unique dogs only

**Verification**:
- [ ] No duplicate dogs in email
- [ ] Count matches unique dogs

---

### Test 2.5: Sorting (Freshness → Score → Distance)
**Steps**:
1. Trigger email with multiple matches
2. Check order of dogs in email

**Expected**:
- Dogs sorted by:
  1. Freshness (published_at descending)
  2. Score (matchScore descending)
  3. Distance (ascending)

**Verification**:
- [ ] Order matches expected sort
- [ ] Top 5 dogs are freshest/best matches

---

## Test Suite 3: Unsubscribe Flow - Token Resolution

### Test 3.1: GET /api/unsubscribe/resolve - Valid Token
**Steps**:
1. Get unsubscribe token from email (or generate one)
2. Call: `GET /api/unsubscribe/resolve?token={TOKEN}`

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "user_id": "...",
    "email_masked": "te**@****.com",
    "plan_status": "pro",
    "current_period_end": "2024-12-31T23:59:59Z",
    "can_unsubscribe": true,
    "cancel_at_period_end": false,
    "email_enabled": true
  }
}
```

**Verification**:
- [ ] Returns user info
- [ ] Email is masked
- [ ] Plan status correct
- [ ] Period end date present (if Pro)
- [ ] Can unsubscribe = true

---

### Test 3.2: GET /api/unsubscribe/resolve - Expired Token
**Steps**:
1. Use expired token (or create one with short TTL)
2. Call resolve endpoint

**Expected**:
- Status: 401 or 400
- Error: `"TOKEN_EXPIRED"` or similar

**Verification**:
- [ ] Error response correct
- [ ] No user data returned

---

### Test 3.3: GET /api/unsubscribe/resolve - Invalid Token
**Steps**:
1. Use malformed/invalid token
2. Call resolve endpoint

**Expected**:
- Status: 400
- Error: `"INVALID_TOKEN"`

**Verification**:
- [ ] Error response correct
- [ ] Clear error message

---

## Test Suite 4: Unsubscribe Flow - Unsubscribe Action

### Test 4.1: POST /api/unsubscribe - Pro User (First Time)
**Prerequisites**:
- User has active Pro subscription
- User has `email_enabled=true`
- `cancel_at_period_end=false`

**Steps**:
1. Call: `POST /api/unsubscribe` with valid token
2. Check response
3. Verify Stripe subscription
4. Verify database state

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "plan_status": "pro_pending_cancel",
    "current_period_end": "2024-12-31T23:59:59Z",
    "email_enabled": false
  }
}
```

**Database Verification**:
- [ ] `alert_settings.enabled = false`
- [ ] `plans.cancel_at_period_end = true`
- [ ] `plans.current_period_end` updated
- [ ] `plans.status = 'pro_pending_cancel'`

**Stripe Verification**:
- [ ] Subscription `cancel_at_period_end = true`
- [ ] Subscription still `active` (not cancelled)
- [ ] `current_period_end` matches DB

**Verification**:
- [ ] Alerts disabled immediately
- [ ] Cancellation scheduled (not immediate)
- [ ] Pro benefits remain active
- [ ] Response includes period end date

---

### Test 4.2: POST /api/unsubscribe - Already Scheduled
**Prerequisites**:
- User already has `cancel_at_period_end=true`

**Steps**:
1. Call unsubscribe endpoint again
2. Verify idempotency

**Expected**:
- Alerts disabled (if not already)
- No Stripe API call
- Status remains `pro_pending_cancel`
- Period end unchanged

**Verification**:
- [ ] Idempotent (no errors)
- [ ] State unchanged
- [ ] Alerts remain off

---

### Test 4.3: POST /api/unsubscribe - Free User
**Prerequisites**:
- User has Free plan (no subscription)

**Steps**:
1. Call unsubscribe endpoint
2. Verify response

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "plan_status": "free",
    "current_period_end": null,
    "email_enabled": false
  }
}
```

**Verification**:
- [ ] Alerts disabled
- [ ] No Stripe call made
- [ ] Plan status remains "free"
- [ ] No period end date

---

### Test 4.4: POST /api/unsubscribe - Token Reuse Prevention
**Steps**:
1. Call unsubscribe endpoint with valid token
2. Call again with same token

**Expected** (second call):
- Status: 400
- Error: `"This unsubscribe link has already been used"`

**Verification**:
- [ ] First call succeeds
- [ ] Second call fails with appropriate error
- [ ] Token jti recorded in `email_events`

---

## Test Suite 5: Unsubscribe Page UI

### Test 5.1: Unsubscribe Page - Initial Load
**Steps**:
1. Navigate to: `/unsubscribe?token={VALID_TOKEN}`
2. Check page content

**Expected**:
- Title: "Unsubscribe from Email Alerts"
- Body: "Unsubscribing will turn off email alerts immediately and cancel your Pro plan at the end of your current billing period..."
- Warning card with bullet points:
  - Turn off email alerts now
  - Keep Pro through {date}
  - Cancel plan at period end → downgrade to Free
- Primary button: "Unsubscribe (alerts off now, cancel at period end)"
- Footer links: "Manage preferences" and "Back to Home"

**Verification**:
- [ ] All text matches requirements
- [ ] Button text correct
- [ ] Links present
- [ ] Date displayed if Pro user

---

### Test 5.2: Unsubscribe Page - Success State
**Steps**:
1. Complete unsubscribe action
2. Check success state

**Expected**:
- Title: "You're unsubscribed"
- Message: "Email alerts are off. Your Pro plan remains active until {date}. We'll downgrade you to Free after that."
- CTAs:
  - "Manage subscription" → `/profile#billing`
  - "Turn alerts back on" (toggles alerts)

**Verification**:
- [ ] Success message clear
- [ ] Period end date shown
- [ ] CTAs functional
- [ ] No errors

---

### Test 5.3: Unsubscribe Page - Free User
**Steps**:
1. Navigate with token for Free user
2. Complete unsubscribe

**Expected**:
- Simplified message: "Email alerts are off."
- No period end date mentioned
- CTA: "Manage preferences" → `/profile`

**Verification**:
- [ ] Simplified state shown
- [ ] No billing references
- [ ] Appropriate CTA

---

### Test 5.4: Unsubscribe Page - Already Scheduled
**Steps**:
1. Navigate with token for user who already has `cancel_at_period_end=true`
2. Check page state

**Expected**:
- Notice card: "Cancellation already scheduled for {date}. Email alerts will now be turned off."
- No primary button (already processed)
- Info message about scheduled cancellation

**Verification**:
- [ ] Notice displayed
- [ ] No action button
- [ ] Date shown

---

### Test 5.5: Unsubscribe Page - Invalid Token
**Steps**:
1. Navigate with invalid/expired token
2. Check error state

**Expected**:
- Error message appropriate to error type
- Guidance on what to do
- Link to sign in

**Verification**:
- [ ] Error message clear
- [ ] Guidance helpful
- [ ] Recovery path available

---

### Test 5.6: Unsubscribe Page - Token User Mismatch
**Steps**:
1. Sign in as User A
2. Use unsubscribe token for User B
3. Check page behavior

**Expected**:
- Banner: "Changes will be applied to s**@****.com"
- Process continues with token user (not session user)
- Success message reflects token user

**Verification**:
- [ ] Banner shown
- [ ] Token user used (not session)
- [ ] Clear which user affected

---

## Test Suite 6: Integration Tests

### Test 6.1: End-to-End Unsubscribe Flow
**Steps**:
1. User receives email alert
2. Click unsubscribe link in email
3. Complete unsubscribe
4. Verify state changes
5. Check email received (if applicable)

**Expected**:
- Email has correct subject and preheader
- Unsubscribe link works
- Page loads correctly
- Unsubscribe succeeds
- State changes persist
- User receives confirmation (if applicable)

**Verification**:
- [ ] Full flow works
- [ ] No errors
- [ ] State consistent

---

### Test 6.2: Email Footer Links
**Steps**:
1. Open email alert
2. Check footer links

**Expected**:
- "Manage preferences" → `/profile`
- "Unsubscribe" → `/unsubscribe?token={TOKEN}`

**Verification**:
- [ ] Links present
- [ ] Links functional
- [ ] Token in unsubscribe link

---

### Test 6.3: Cron Job Integration
**Steps**:
1. Set up user with enabled alerts
2. Wait for cron or trigger manually
3. Verify email sent
4. Check subject/preheader
5. Check matches count

**Expected**:
- Email sent with correct format
- Subject matches requirements
- Preheader present
- Matches count accurate
- Skip if no matches

**Verification**:
- [ ] Email format correct
- [ ] All requirements met
- [ ] Cron job logs show success

---

## Test Suite 7: Edge Cases & Error Handling

### Test 7.1: Stripe API Failure
**Steps**:
1. Temporarily break Stripe connection (or use invalid key)
2. Attempt unsubscribe
3. Check error handling

**Expected**:
- Alerts still disabled
- Error logged but not thrown
- DB state updated (best effort)
- User sees success (alerts off)

**Verification**:
- [ ] Alerts disabled (primary action)
- [ ] Error handled gracefully
- [ ] User experience not broken

---

### Test 7.2: Database Connection Failure
**Steps**:
1. Simulate DB failure
2. Attempt unsubscribe

**Expected**:
- Appropriate error response
- User informed
- No partial state

**Verification**:
- [ ] Error handled
- [ ] Clear error message
- [ ] No corruption

---

### Test 7.3: Missing Environment Variables
**Steps**:
1. Temporarily remove `EMAIL_TOKEN_SECRET`
2. Attempt token resolution/unsubscribe

**Expected**:
- Clear error about missing config
- No crashes
- Appropriate HTTP status

**Verification**:
- [ ] Error message helpful
- [ ] No 500 errors
- [ ] Status code correct

---

## Test Suite 8: Data Consistency

### Test 8.1: Provider & DB State Sync
**Steps**:
1. Complete unsubscribe
2. Check Stripe dashboard
3. Check database

**Expected**:
- Stripe `cancel_at_period_end = true`
- DB `cancel_at_period_end = true`
- DB `current_period_end` matches Stripe
- DB `status = 'pro_pending_cancel'`

**Verification**:
- [ ] States match
- [ ] No discrepancies
- [ ] Period end dates align

---

### Test 8.2: Multiple Rapid Unsubscribes
**Steps**:
1. Click unsubscribe button multiple times rapidly
2. Check idempotency

**Expected**:
- First request succeeds
- Subsequent requests handled gracefully
- No duplicate state changes
- Token jti prevents reuse

**Verification**:
- [ ] Idempotent
- [ ] No errors
- [ ] State correct

---

## 📊 Success Criteria

All tests should pass with:
- ✅ No 500 errors
- ✅ Clear error messages
- ✅ State consistency (Stripe ↔ DB)
- ✅ Email format correct
- ✅ Unsubscribe flow works end-to-end
- ✅ Edge cases handled gracefully

---

## 🐛 Troubleshooting

### Common Issues

**Email not sending**:
- Check Resend API key
- Verify email domain
- Check cron job logs

**Unsubscribe not working**:
- Verify `EMAIL_TOKEN_SECRET` set
- Check token expiration
- Verify Stripe connection

**State mismatch**:
- Check Stripe dashboard
- Verify DB schema
- Check logs for errors

**Subject line wrong**:
- Verify ZIP codes in preferences
- Check match count calculation
- Review email template

---

## 📝 Test Results Template

```
Test Date: __________
Tester: __________
Environment: staging

Email Subject & Preheader:
[ ] Test 1.1 - Single ZIP
[ ] Test 1.2 - Multiple ZIPs (2-3)
[ ] Test 1.3 - Many ZIPs (>3)
[ ] Test 1.4 - Match Count Display

Matches Found Calculation:
[ ] Test 2.1 - Skip Send When No Matches
[ ] Test 2.2 - Count New Dogs
[ ] Test 2.3 - Count Updated Dogs
[ ] Test 2.4 - De-duplication
[ ] Test 2.5 - Sorting

Unsubscribe Flow - Token Resolution:
[ ] Test 3.1 - Valid Token
[ ] Test 3.2 - Expired Token
[ ] Test 3.3 - Invalid Token

Unsubscribe Flow - Unsubscribe Action:
[ ] Test 4.1 - Pro User (First Time)
[ ] Test 4.2 - Already Scheduled
[ ] Test 4.3 - Free User
[ ] Test 4.4 - Token Reuse Prevention

Unsubscribe Page UI:
[ ] Test 5.1 - Initial Load
[ ] Test 5.2 - Success State
[ ] Test 5.3 - Free User
[ ] Test 5.4 - Already Scheduled
[ ] Test 5.5 - Invalid Token
[ ] Test 5.6 - Token User Mismatch

Integration Tests:
[ ] Test 6.1 - End-to-End Flow
[ ] Test 6.2 - Email Footer Links
[ ] Test 6.3 - Cron Job Integration

Edge Cases:
[ ] Test 7.1 - Stripe API Failure
[ ] Test 7.2 - Database Connection Failure
[ ] Test 7.3 - Missing Environment Variables

Data Consistency:
[ ] Test 8.1 - Provider & DB State Sync
[ ] Test 8.2 - Multiple Rapid Unsubscribes

Overall Status: PASS / FAIL
Notes: __________
```

---

## 🚀 Post-Testing

Once all tests pass:
1. Document any issues found
2. Update this test plan with learnings
3. Prepare for production deployment
4. Update user documentation if needed

