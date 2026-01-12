# Monetization CTA Placement - Test Plan

**Feature:** Monetization CTA Placement & Funnel Optimization  
**Date:** 2026-01-12  
**Status:** Ready for Testing

---

## Test Environment Setup

### Prerequisites
- Staging environment deployed and accessible
- Test Stripe account configured (test mode)
- Test user accounts:
  - **Signed-out user** (no account)
  - **Free user** (authenticated, free plan)
  - **Pro user** (authenticated, Pro plan)

### Test Data
- Use real zip codes for testing (e.g., 94102, 10001, 90210)
- Ensure test database has sample dogs available

---

## Test Cases

### 1. `/find` Page - No Monetization

#### Test 1.1: Signed-Out User Experience
**Steps:**
1. Navigate to `/find` as signed-out user
2. Verify no Pro/upgrade banners are visible
3. Fill out preference form (at least zip code)
4. Verify "What happens next" informational copy appears above submit button
5. Verify submit button text is "See my matches"
6. Submit form and navigate to results

**Expected Results:**
- ✅ No monetization CTAs visible on `/find` page
- ✅ Informational copy displays: "We'll show you dogs available right now that match your preferences. You'll also have the option to save your preferences and get alerts when new matches appear."
- ✅ No pricing links or upgrade buttons
- ✅ Form submission works normally

**Analytics Events:**
- `find_submitted` should fire
- No `pricing_cta_pro` events from `/find` page

---

#### Test 1.2: Free User Experience
**Steps:**
1. Sign in as free user
2. Navigate to `/find`
3. Verify no Pro/upgrade banners visible
4. Fill out and submit form

**Expected Results:**
- ✅ Same as Test 1.1 - no monetization visible
- ✅ Preferences save indicator may appear after submission (existing behavior)

---

#### Test 1.3: Pro User Experience
**Steps:**
1. Sign in as Pro user
2. Navigate to `/find`
3. Verify no monetization CTAs
4. Submit form

**Expected Results:**
- ✅ No monetization CTAs (Pro users don't need them)
- ✅ Form works normally

---

### 2. `/results` Page - Above-the-Fold CTA

#### Test 2.1: Signed-Out User - Top CTA
**Steps:**
1. Navigate to `/results` as signed-out user (with search params)
2. Verify above-the-fold CTA appears below "Found X dogs" header
3. Verify CTA content:
   - Headline: "You're seeing dogs available right now"
   - Body: "New rescue dogs that match your preferences appear unpredictably and are adopted fast. Pro keeps watching and alerts you the moment the next match shows up."
   - Button: "Turn on alerts – $9.99/month"
   - Helper text: "You're seeing dogs available right now. Pro keeps watching and alerts you when the next match appears."
4. Click CTA button
5. Verify redirect to sign-in page with callback URL
6. Sign in
7. Verify redirect back to results page
8. Verify CTA still visible (now as authenticated free user)

**Expected Results:**
- ✅ CTA visible for signed-out users
- ✅ CTA positioned correctly below header
- ✅ All copy matches PRD specifications
- ✅ Redirect to sign-in preserves current URL
- ✅ After sign-in, returns to results page
- ✅ CTA still visible after authentication

**Analytics Events:**
- `alerts_cta_clicked` with `location: 'top'`, `user_authenticated: false`
- `auth_login_success` after sign-in
- `results_viewed` on return to results page

---

#### Test 2.2: Free User - Top CTA
**Steps:**
1. Sign in as free user
2. Navigate to `/results` (with search params)
3. Verify above-the-fold CTA appears
4. Click "Turn on alerts – $9.99/month" button
5. Verify redirect to Stripe checkout (test mode)
6. Complete test checkout with test card: `4242 4242 4242 4242`
7. Verify redirect to profile page after successful checkout
8. Verify user plan updated to Pro

**Expected Results:**
- ✅ CTA visible for free users
- ✅ Clicking CTA triggers Stripe checkout
- ✅ Checkout completes successfully
- ✅ User upgraded to Pro
- ✅ Redirect to profile page with success message

**Analytics Events:**
- `alerts_cta_clicked` with `location: 'top'`, `user_authenticated: true`, `current_plan: 'free'`
- `stripe_checkout_started` with `source: 'results_page'`, `location: 'top'`
- `checkout_success` (tracked by webhook)
- `stripe_checkout_completed` (if tracked)

---

#### Test 2.3: Pro User - No CTA
**Steps:**
1. Sign in as Pro user
2. Navigate to `/results` (with search params)
3. Verify NO above-the-fold CTA appears
4. Verify results display normally

**Expected Results:**
- ✅ No monetization CTA visible for Pro users
- ✅ Results page displays normally
- ✅ No upgrade prompts

**Analytics Events:**
- `results_viewed` should fire
- No `alerts_cta_clicked` events (CTA not shown)

---

### 3. `/results` Page - Inline Reminder CTA

#### Test 3.1: Signed-Out User - Inline CTA
**Steps:**
1. Navigate to `/results` as signed-out user
2. Scroll to "All Matches" section
3. Verify inline CTA appears after 3rd dog card
4. Verify CTA content:
   - Copy: "These dogs are available now. New matches appear every week."
   - Button: "Get alerts for new matches"
5. Click CTA button
6. Verify redirect to sign-in with callback URL
7. Sign in and verify redirect back to results

**Expected Results:**
- ✅ Inline CTA appears after 3rd dog card
- ✅ CTA only shows when there are 3+ dogs
- ✅ CTA positioned correctly in grid layout
- ✅ Sign-in flow works correctly

**Analytics Events:**
- `alerts_cta_clicked` with `location: 'inline'`, `user_authenticated: false`

---

#### Test 3.2: Free User - Inline CTA
**Steps:**
1. Sign in as free user
2. Navigate to `/results`
3. Scroll to "All Matches" section
4. Verify inline CTA appears after 3rd dog card
5. Click "Get alerts for new matches" button
6. Verify redirect to Stripe checkout
7. Complete checkout

**Expected Results:**
- ✅ Inline CTA visible for free users
- ✅ Clicking triggers Stripe checkout
- ✅ Checkout completes successfully

**Analytics Events:**
- `alerts_cta_clicked` with `location: 'inline'`, `user_authenticated: true`, `current_plan: 'free'`
- `stripe_checkout_started` with `location: 'inline'`

---

#### Test 3.3: Pro User - No Inline CTA
**Steps:**
1. Sign in as Pro user
2. Navigate to `/results`
3. Scroll through "All Matches" section
4. Verify NO inline CTA appears

**Expected Results:**
- ✅ No inline CTA visible for Pro users
- ✅ All dog cards display normally

---

#### Test 3.4: Edge Case - Less Than 3 Dogs
**Steps:**
1. Navigate to `/results` with search that returns < 3 dogs
2. Verify inline CTA does NOT appear

**Expected Results:**
- ✅ Inline CTA only shows when there are 3+ dogs
- ✅ No CTA shown for 1-2 dogs

---

### 4. User Authentication Flow

#### Test 4.1: Sign-In Callback URL Preservation
**Steps:**
1. As signed-out user, navigate to `/results?zip=94102&age=young,adult`
2. Click top CTA
3. Verify redirect to `/auth/signin?callbackUrl=/results?zip=94102&age=young,adult`
4. Sign in
5. Verify redirect back to `/results?zip=94102&age=young,adult`
6. Verify search results still match original query

**Expected Results:**
- ✅ All query parameters preserved in callback URL
- ✅ After sign-in, user returns to exact same results page
- ✅ Search results unchanged

---

#### Test 4.2: Checkout Flow from Results
**Steps:**
1. As free user, navigate to `/results`
2. Click either CTA (top or inline)
3. Verify redirect to Stripe checkout
4. Verify checkout shows $9.99/month subscription
5. Use test card: `4242 4242 4242 4242`
6. Complete checkout
7. Verify redirect to `/profile?upgrade=success`
8. Verify user plan updated to Pro
9. Return to `/results` page
10. Verify CTAs no longer visible

**Expected Results:**
- ✅ Checkout flow works correctly
- ✅ User upgraded successfully
- ✅ CTAs hidden after upgrade

---

### 5. Analytics Tracking

#### Test 5.1: CTA Click Tracking
**Steps:**
1. Open browser DevTools → Network tab
2. Filter for analytics requests (Umami)
3. As signed-out user, click top CTA
4. Verify `alerts_cta_clicked` event fired with:
   - `location: 'top'`
   - `user_authenticated: false`
   - `current_plan: 'free'` (or undefined)
5. Sign in, click inline CTA
6. Verify `alerts_cta_clicked` event fired with:
   - `location: 'inline'`
   - `user_authenticated: true`
   - `current_plan: 'free'`

**Expected Results:**
- ✅ All CTA clicks tracked correctly
- ✅ Event properties include location and user status
- ✅ Events appear in analytics dashboard

---

#### Test 5.2: Checkout Tracking
**Steps:**
1. As free user, click CTA
2. Verify `stripe_checkout_started` event fired
3. Complete checkout
4. Verify `checkout_success` event fired (via webhook)
5. Check analytics dashboard for events

**Expected Results:**
- ✅ Checkout start tracked
- ✅ Checkout completion tracked
- ✅ Events include source information

---

### 6. Visual & UX Testing

#### Test 6.1: CTA Styling
**Steps:**
1. Navigate to `/results` as free user
2. Verify above-the-fold CTA styling:
   - Gradient background (blue-50 to indigo-50)
   - Border (blue-200)
   - Proper spacing and padding
   - Button uses primary button style
3. Verify inline CTA styling matches

**Expected Results:**
- ✅ CTAs visually distinct but not intrusive
- ✅ Consistent styling across both CTAs
- ✅ Responsive on mobile devices

---

#### Test 6.2: Mobile Responsiveness
**Steps:**
1. Open `/results` on mobile device (or DevTools mobile view)
2. Verify CTAs display correctly:
   - Text readable
   - Buttons tappable
   - Layout doesn't break
3. Test on various screen sizes (320px, 375px, 768px, 1024px)

**Expected Results:**
- ✅ CTAs responsive on all screen sizes
- ✅ Text doesn't overflow
- ✅ Buttons easily tappable

---

### 7. Edge Cases & Error Handling

#### Test 7.1: Stripe Checkout Failure
**Steps:**
1. As free user, click CTA
2. In Stripe checkout, use failing test card: `4000 0000 0000 0002`
3. Verify error handling
4. Verify user remains on free plan
5. Verify can retry checkout

**Expected Results:**
- ✅ Error handled gracefully
- ✅ User not charged
- ✅ Can retry checkout

---

#### Test 7.2: Network Error During Checkout
**Steps:**
1. As free user, click CTA
2. Disable network (DevTools → Network → Offline)
3. Try to trigger checkout
4. Verify error message displayed
5. Re-enable network
6. Verify can retry

**Expected Results:**
- ✅ Network errors handled
- ✅ User-friendly error message
- ✅ Can retry after network restored

---

#### Test 7.3: Results Page with Zero Dogs
**Steps:**
1. Navigate to `/results` with search that returns 0 dogs
2. Verify no CTAs appear (no dogs to show)
3. Verify zero results message displays

**Expected Results:**
- ✅ No CTAs shown when no results
- ✅ Zero results message displays correctly

---

## Success Criteria

### Functional Requirements
- ✅ No monetization CTAs on `/find` page
- ✅ Informational copy on `/find` page
- ✅ Above-the-fold CTA on `/results` for free/signed-out users
- ✅ Inline CTA after 3rd dog card for free/signed-out users
- ✅ CTAs hidden for Pro users
- ✅ Sign-in flow preserves callback URL
- ✅ Stripe checkout works from results page

### Analytics Requirements
- ✅ `alerts_cta_clicked` tracked with location
- ✅ `stripe_checkout_started` tracked
- ✅ `checkout_success` tracked (via webhook)

### UX Requirements
- ✅ CTAs visually appealing but not intrusive
- ✅ Responsive on all devices
- ✅ Clear value proposition
- ✅ Smooth user flow

---

## Test Execution Checklist

- [ ] Test 1.1: Signed-Out User on `/find`
- [ ] Test 1.2: Free User on `/find`
- [ ] Test 1.3: Pro User on `/find`
- [ ] Test 2.1: Signed-Out User - Top CTA
- [ ] Test 2.2: Free User - Top CTA
- [ ] Test 2.3: Pro User - No CTA
- [ ] Test 3.1: Signed-Out User - Inline CTA
- [ ] Test 3.2: Free User - Inline CTA
- [ ] Test 3.3: Pro User - No Inline CTA
- [ ] Test 3.4: Edge Case - Less Than 3 Dogs
- [ ] Test 4.1: Sign-In Callback URL Preservation
- [ ] Test 4.2: Checkout Flow from Results
- [ ] Test 5.1: CTA Click Tracking
- [ ] Test 5.2: Checkout Tracking
- [ ] Test 6.1: CTA Styling
- [ ] Test 6.2: Mobile Responsiveness
- [ ] Test 7.1: Stripe Checkout Failure
- [ ] Test 7.2: Network Error During Checkout
- [ ] Test 7.3: Results Page with Zero Dogs

---

## Known Issues / Notes

_Add any issues discovered during testing here_

---

## Sign-Off

**Tester:** _________________  
**Date:** _________________  
**Status:** ☐ Pass  ☐ Fail  ☐ Needs Rework

