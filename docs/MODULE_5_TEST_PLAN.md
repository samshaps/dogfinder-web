# Module 5: Monetization & Payment Processing - Test Plan

## 🎯 **Test Objectives**

Verify that the Stripe integration works correctly for:
- Creating checkout sessions
- Processing payments
- Updating user plans
- Displaying plan information

## 🧪 **Test Scenarios**

### **1. Pricing Page Functionality**

#### **Test 1.1: View Pricing Page (Unauthenticated)**
- **Steps:**
  1. Navigate to `/pricing`
  2. Verify page loads without errors
  3. Check that both Free and Pro plans are displayed
  4. Verify "Upgrade to Pro" button is shown for Pro plan

- **Expected Results:**
  - Page loads successfully
  - Free plan shows "Choose Free Plan" (disabled)
  - Pro plan shows "Upgrade to Pro" button
  - No current plan indicator shown

- **Analytics Events:**
  - `pricing_page_viewed` with `authenticated: false`

#### **Test 1.2: View Pricing Page (Authenticated - Free User)**
- **Steps:**
  1. Sign in with Google OAuth
  2. Navigate to `/pricing`
  3. Verify current plan is shown as "Free"
  4. Check plan indicators

- **Expected Results:**
  - "Current plan: Free" displayed at top
  - Free plan shows "Current Plan" badge
  - Pro plan shows "Upgrade to Pro" button

- **Analytics Events:**
  - `pricing_page_viewed` with `authenticated: true`

#### **Test 1.3: View Pricing Page (Authenticated - Pro User)**
- **Steps:**
  1. Sign in with Google OAuth
  2. Upgrade to Pro plan (via Stripe test mode)
  3. Navigate to `/pricing`
  4. Verify current plan is shown as "Pro"

- **Expected Results:**
  - "Current plan: Pro" displayed at top
  - Pro plan shows "Active Plan" badge
  - Free plan shows "Downgrade Available" button

### **2. Profile Page Plan Display**

#### **Test 2.1: Free User Profile**
- **Steps:**
  1. Sign in as free user
  2. Navigate to `/profile`
  3. Check plan information section

- **Expected Results:**
  - Plan section shows "Free Plan" with blue star icon
  - Status shows "active"
  - Features list shows Free plan features
  - "Upgrade to Pro" button is present

- **Analytics Events:**
  - `profile_viewed` with user details

#### **Test 2.2: Pro User Profile**
- **Steps:**
  1. Sign in as pro user
  2. Navigate to `/profile`
  3. Check plan information section

- **Expected Results:**
  - Plan section shows "Pro Plan" with crown icon
  - Status shows "active"
  - Features list shows Pro plan features
  - No upgrade button (user already has Pro)

### **3. Stripe Checkout Flow**

#### **Test 3.1: Create Checkout Session (Free User)**
- **Steps:**
  1. Sign in as free user
  2. Go to `/pricing`
  3. Click "Upgrade to Pro"
  4. Verify redirect to Stripe Checkout

- **Expected Results:**
  - Button shows "Processing..." briefly
  - Redirects to Stripe Checkout page
  - Checkout shows $9.99/month subscription

- **Analytics Events:**
  - `pricing_cta_pro` with `authenticated: true`

#### **Test 3.2: Create Checkout Session (Unauthenticated)**
- **Steps:**
  1. Go to `/pricing` without signing in
  2. Click "Upgrade to Pro"
  3. Verify redirect to sign-in page

- **Expected Results:**
  - Redirects to `/auth/signin`
  - No Stripe checkout created

- **Analytics Events:**
  - `pricing_cta_pro` with `authenticated: false`

### **4. Stripe Webhook Processing**

#### **Test 4.1: Successful Payment**
- **Steps:**
  1. Complete test payment in Stripe Checkout
  2. Check webhook logs in Vercel
  3. Verify user plan updated in database

- **Expected Results:**
  - Webhook receives `checkout.session.completed` event
  - User plan updated to "pro" in database
  - User redirected to `/profile?upgrade=success`

#### **Test 4.2: Failed Payment**
- **Steps:**
  1. Use test card that fails (4000 0000 0000 0002)
  2. Check webhook logs
  3. Verify user plan remains "free"

- **Expected Results:**
  - Payment fails in Stripe Checkout
  - User redirected to `/pricing?upgrade=cancelled`
  - User plan remains "free"

### **5. Plan Management Logic**

#### **Test 5.1: Plan Limits (Free User)**
- **Steps:**
  1. Sign in as free user
  2. Use search functionality
  3. Check if limits are enforced

- **Expected Results:**
  - Search works normally (limits not yet enforced)
  - Plan info shows correct limits

#### **Test 5.2: Plan Limits (Pro User)**
- **Steps:**
  1. Sign in as pro user
  2. Use search functionality
  3. Check if Pro features are available

- **Expected Results:**
  - Search works normally
  - Pro features are accessible

## 🔧 **Test Data**

### **Stripe Test Cards:**
- **Success:** 4242 4242 4242 4242
- **Declined:** 4000 0000 0000 0002
- **Requires Authentication:** 4000 0025 0000 3155

### **Test User:**
- Use your Google OAuth account
- Start with free plan
- Test upgrade to Pro

## 📊 **Success Criteria**

✅ **All tests pass:**
- Pricing page displays correctly for all user states
- Profile page shows accurate plan information
- Stripe checkout sessions create successfully
- Webhooks process payment events correctly
- User plans update in database
- Analytics events fire appropriately

## 🚨 **Known Limitations**

- **Plan limits enforcement:** Not yet implemented (search limits, feature restrictions)
- **Downgrade functionality:** Not implemented (users can't cancel Pro)
- **Subscription management:** No customer portal for managing subscriptions
- **Payment history:** No display of past payments

## 🎯 **Next Steps After Testing**

1. **Fix any issues** found during testing
2. **Implement plan limits** enforcement
3. **Add subscription management** features
4. **Create customer portal** for billing
5. **Move to Module 6** (Email Alerts)

## 📝 **Test Results**

- [ ] Test 1.1: Pricing page (unauthenticated)
- [ ] Test 1.2: Pricing page (free user)
- [ ] Test 1.3: Pricing page (pro user)
- [ ] Test 2.1: Profile page (free user)
- [ ] Test 2.2: Profile page (pro user)
- [ ] Test 3.1: Checkout session (free user)
- [ ] Test 3.2: Checkout session (unauthenticated)
- [ ] Test 4.1: Successful payment
- [ ] Test 4.2: Failed payment
- [ ] Test 5.1: Plan limits (free user)
- [ ] Test 5.2: Plan limits (pro user)

**Overall Status:** [ ] PASS [ ] FAIL
**Issues Found:** [List any issues]
**Ready for Module 6:** [ ] YES [ ] NO
