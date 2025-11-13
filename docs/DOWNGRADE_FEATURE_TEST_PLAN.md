# Downgrade Feature Testing Plan

## Overview
Test the new Pro → Free plan downgrade feature that allows users to cancel their subscription at period end via the profile page.

## Prerequisites
1. ✅ Feature deployed to staging environment
2. ✅ Test user account with **Pro Plan** subscription active in Stripe
3. ✅ Access to Stripe Dashboard (to verify subscription status)
4. ✅ Access to Supabase dashboard (to verify database updates)
5. ✅ Browser developer tools open (to check API calls and console)

---

## Test Scenarios

### 1. Happy Path: Successful Downgrade Flow

#### Steps:
1. **Navigate to Profile Page**
   - Sign in with a Pro account
   - Go to `/profile`
   - Verify "Current Plan" section shows "Pro Plan" with "ACTIVE" status

2. **Click Downgrade Button**
   - Scroll to "Current Plan" section
   - Verify "Downgrade to Free Plan" button is visible
   - Click the button
   - **Expected**: Confirmation modal appears

3. **Review Confirmation Modal**
   - **Expected**:
     - Modal title: "Downgrade to Free?"
     - Body text explains loss of Pro features
     - Mentions access continues until period end
     - Two buttons: "Cancel" and "Confirm Downgrade"
     - Close (X) button visible in top-right

4. **Cancel the Downgrade**
   - Click "Cancel" or close button
   - **Expected**: Modal closes, no changes made
   - Verify profile still shows Pro plan

5. **Confirm the Downgrade**
   - Click "Downgrade to Free Plan" button again
   - Click "Confirm Downgrade" in modal
   - **Expected**:
     - Button shows "Processing..." with spinner
     - Modal closes after API response
     - Success notification appears: "Your Pro plan will end on [DATE]"
     - Date format: "Month Day, Year" (e.g., "January 15, 2024")

6. **Verify Stripe Subscription**
   - Check Stripe Dashboard → Subscriptions
   - Find the test user's subscription
   - **Expected**:
     - Status: "Active"
     - `cancel_at_period_end`: `true`
     - Subscription will cancel automatically when period ends

7. **Verify Database State**
   - Check Supabase `plans` table
   - **Expected**:
     - `plan_type`: Still `'pro'` (not changed yet)
     - `status`: `'active'`
     - `stripe_subscription_id`: Still present

8. **Verify UI State**
   - Refresh profile page
   - **Expected**:
     - Still shows "Pro Plan ACTIVE"
     - Success notification persists with end date
     - "Downgrade to Free Plan" button still visible
     - Clicking again shows: "Downgrade already scheduled" message

---

### 2. Edge Case: Already Scheduled for Cancellation

#### Steps:
1. Attempt downgrade after it's already scheduled
2. **Expected**:
   - API returns: "Downgrade already scheduled"
   - Success notification shows same period end date
   - No duplicate cancellation requests to Stripe

---

### 3. Edge Case: User on Free Plan

#### Steps:
1. Sign in with a Free account
2. Navigate to `/profile`
3. **Expected**:
   - No "Downgrade to Free Plan" button visible
   - Shows "Upgrade to Pro Plan" button instead
   - Attempting direct API call returns: "You are not on a Pro plan"

---

### 4. Edge Case: No Active Subscription in Stripe

#### Steps:
1. Manually delete subscription from Stripe Dashboard (or use test data)
2. Attempt downgrade via UI
3. **Expected**:
   - API handles gracefully
   - Local plan updated to Free immediately
   - Success message shown (no period end date)

---

### 5. API Direct Testing

#### Test Endpoint: `POST /api/stripe/downgrade`

```bash
# Get auth token first (from browser DevTools → Application → Cookies)
# Or use browser's Network tab to copy request

curl -X POST https://[staging-url]/api/stripe/downgrade \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=[token]"

# Expected response:
{
  "message": "Downgrade scheduled successfully",
  "periodEnd": "2024-01-15T00:00:00.000Z"
}
```

#### Test Cases:
- ✅ **Unauthenticated**: Returns 401 Unauthorized
- ✅ **Free user**: Returns 400 "You are not on a Pro plan"
- ✅ **Pro user**: Returns 200 with period end date
- ✅ **Already cancelled**: Returns 200 "Downgrade already scheduled"

---

### 6. Analytics Tracking

#### Verify Events Fired:
Open browser DevTools → Network → Filter "umami" or check analytics dashboard

**Expected Events:**
1. `profile_downgrade_button_clicked` - When button clicked
2. `profile_downgrade_initiated` - When API call starts
3. `profile_downgrade_success` - On successful downgrade
4. `profile_downgrade_failed` - On error (if any)

**Event Properties:**
- `user_id`: User UUID
- `source`: "profile_page"
- `periodEnd`: ISO date string (on success)

---

### 7. Webhook Integration (Period End)

#### Simulate Subscription End:
1. In Stripe Dashboard, find the test subscription
2. Use Stripe CLI or Dashboard to manually trigger `customer.subscription.deleted` event:
   ```bash
   # Stripe CLI
   stripe trigger customer.subscription.deleted \
     --override subscription:metadata:user_id=[user-id]
   ```

3. **Expected**:
   - Webhook receives event
   - `plans` table updated:
     - `plan_type`: `'free'`
     - `status`: `'cancelled'`
     - `stripe_subscription_id`: `null`

4. **Verify UI After Period End:**
   - Refresh profile page
   - **Expected**: Shows "Free Plan ACTIVE"
   - "Upgrade to Pro Plan" button visible
   - Downgrade success notification removed

---

## Verification Checklist

### Frontend
- [ ] Downgrade button visible only for Pro users
- [ ] Confirmation modal displays correctly
- [ ] Success notification shows correct date format
- [ ] Loading states work (spinner during API call)
- [ ] Error handling works (network failures, etc.)
- [ ] Modal can be closed via X, Cancel, or backdrop click
- [ ] Button disabled during processing

### Backend
- [ ] API endpoint requires authentication
- [ ] Validates user has Pro plan
- [ ] Correctly schedules cancellation at period end
- [ ] Returns period end date in ISO format
- [ ] Handles already-cancelled subscriptions
- [ ] Handles missing Stripe subscriptions gracefully
- [ ] Proper error messages returned

### Database
- [ ] Plan not immediately changed to Free (stays Pro until period end)
- [ ] Status remains 'active' until period end
- [ ] `updated_at` timestamp updated on downgrade
- [ ] After webhook processes deletion, plan_type → 'free'

### Stripe Integration
- [ ] `cancel_at_period_end` set to `true`
- [ ] Subscription remains active until period end
- [ ] Webhook `customer.subscription.deleted` properly handled
- [ ] Final downgrade happens automatically via webhook

### Analytics
- [ ] All downgrade events tracked
- [ ] Event properties include correct user_id
- [ ] Success/failure events differentiate properly

---

## Rollback Plan

If issues are found:

1. **Immediate Rollback:**
   ```bash
   git revert a5e172a
   git push origin staging
   ```

2. **Re-enable Pro Features:**
   - If a test user's subscription was cancelled:
     - In Stripe Dashboard, find subscription
     - Click "Reactivate subscription" or update `cancel_at_period_end` to `false`

3. **Database Cleanup (if needed):**
   ```sql
   -- Only if webhook already processed deletion
   UPDATE plans 
   SET plan_type = 'pro', status = 'active' 
   WHERE user_id = '[test-user-id]';
   ```

---

## Known Limitations / Notes

1. **Period End Date**: The date shown is when Stripe will cancel the subscription. User retains Pro access until then.

2. **No Immediate Cancellation**: This implementation cancels at period end for better UX. Immediate cancellation would require different handling.

3. **Email Notification**: Optional email confirmation is mentioned in requirements but not yet implemented. Can be added later.

4. **Re-upgrade**: Users can re-upgrade before period ends by going through normal upgrade flow.

---

## Test Environment

- **Staging URL**: `https://[your-staging-url]`
- **Stripe Mode**: Use test mode for all testing
- **Test Payment Method**: Use Stripe test cards (4242 4242 4242 4242)

---

## Questions / Issues to Report

If you encounter any issues, note:
1. Browser/OS version
2. Step where issue occurred
3. Error messages (console/network)
4. Screenshots if applicable
5. Stripe subscription ID (for debugging)

---

**Last Updated**: After commit `a5e172a` (Pro to Free downgrade feature)

