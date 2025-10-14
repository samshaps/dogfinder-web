# DogYenta v2 - Analytics Events Dictionary

All events tracked via Umami. **No PII or dog identifiers in payloads.**

## Implementation

Events are tracked using the `trackEvent()` utility from `lib/analytics/tracking.ts`:

```typescript
trackEvent('event_name', {
  property1: 'value1',
  property2: 123
});
```

All events pass through sanitization to ensure no PII leaks.

---

## Page Views (Automatic)

These are tracked automatically by Umami when pages load:

- `/` - Home page
- `/pricing` - Pricing page
- `/find` - Dog preference intake form
- `/results` - Matched dogs results
- `/profile` - User profile and settings
- `/about` - About page

---

## User Events

### Authentication

**`auth_login_clicked`**
- **When**: User clicks "Sign in with Google" button
- **Properties**: None
- **Funnel**: Entry point for auth flow

**`auth_login_success`**
- **When**: User successfully completes Google OAuth
- **Properties**: 
  - `isNewUser` (boolean) - true if first time signing in
  - `redirectTo` (string) - next page they'll see (e.g., 'find', 'profile')
- **Funnel**: Auth flow completion

**`auth_logout`**
- **When**: User clicks logout
- **Properties**: None

---

### Pricing & Plans

**`pricing_page_viewed`**
- **When**: User lands on /pricing
- **Properties**:
  - `source` (string) - referrer (e.g., 'nav', 'upgrade_cta', 'direct')
  - `authenticated` (boolean) - whether user is logged in
- **Funnel**: Top of conversion funnel

**`pricing_cta_free`**
- **When**: User clicks "Choose Free Plan" CTA
- **Properties**:
  - `authenticated` (boolean) - whether user was logged in
- **Funnel**: Free plan selection

**`pricing_cta_pro`**
- **When**: User clicks "Upgrade to Pro" CTA
- **Properties**:
  - `authenticated` (boolean) - whether user was logged in
  - `currentPlan` (string) - 'free' or 'guest'
- **Funnel**: Pro plan intent

---

### Intake Flow (/find)

**`find_started`**
- **When**: User lands on /find page
- **Properties**:
  - `authenticated` (boolean)
  - `hasExistingPreferences` (boolean) - whether we loaded saved prefs
- **Funnel**: Entry to intake flow

**`find_location_set`**
- **When**: User completes location field (on blur/change)
- **Properties**:
  - `radius` (number) - selected radius in miles
- **Funnel**: Key milestone in form completion

**`find_preferences_saved`**
- **When**: Autosave triggers for logged-in users
- **Properties**:
  - `fieldsCompleted` (number) - count of non-empty preference fields
- **Note**: Fires after debounce (2-3 seconds after user stops typing)

**`find_submitted`**
- **When**: User clicks "Find Dogs" / submits form
- **Properties**:
  - `authenticated` (boolean)
  - `preferencesCount` (number) - total preferences specified
  - `hasBreedPreference` (boolean)
- **Funnel**: Form submission, leads to results

---

### Results Page (/results)

**`results_viewed`**
- **When**: Results page loads successfully
- **Properties**:
  - `matchCount` (number) - number of dogs shown
  - `plan` (string) - 'free' or 'pro'
  - `authenticated` (boolean)
- **Funnel**: Results displayed

**`results_dog_clicked`**
- **When**: User clicks on a dog card
- **Properties**:
  - `position` (number) - 1-indexed position in results
  - `matchScore` (number) - score from matching algorithm (0-100)
- **Purpose**: Track engagement with results

**`results_alert_toggled`**
- **When**: Pro user enables/disables alerts
- **Properties**:
  - `enabled` (boolean) - new state
  - `cadence` (string) - 'daily' or 'weekly'
- **Funnel**: Alert activation

**`results_upgrade_clicked`**
- **When**: Free user clicks "Upgrade to Pro" from disabled alert toggle
- **Properties**: None
- **Funnel**: Leads to pricing/checkout

---

### Alerts & Email

**`alert_email_sent`**
- **When**: Server successfully sends an alert email
- **Properties**:
  - `cadence` (string) - 'daily' or 'weekly'
  - `dogCount` (number) - number of new dogs in alert
  - `recipientPlanStatus` (string) - 'pro_active', etc.
- **Note**: Logged server-side, not from client
- **Funnel**: Alert delivery

**`alert_email_opened`**
- **When**: User opens alert email (via tracking pixel)
- **Properties**:
  - `cadence` (string)
- **Note**: Requires email tracking pixel in template

**`alert_email_clicked`**
- **When**: User clicks a dog link in alert email
- **Properties**:
  - `cadence` (string)
  - `linkPosition` (number) - which dog they clicked (1-indexed)
- **Funnel**: Alert engagement

**`alert_paused`**
- **When**: User clicks "Pause alerts" in email footer
- **Properties**:
  - `source` (string) - 'email_footer' or 'profile'
- **Funnel**: Alert churn

**`alert_unsubscribed`**
- **When**: User clicks unsubscribe link
- **Properties**:
  - `source` (string) - 'email_footer'
  - `reason` (string) - optional if we add reason selector
- **Funnel**: Alert churn

**`alert_resumed`**
- **When**: User re-enables alerts after pausing
- **Properties**:
  - `daysSincePaused` (number)
- **Funnel**: Re-engagement

---

### Payments & Subscriptions

**`checkout_initiated`**
- **When**: User clicks "Upgrade Now" and Stripe checkout opens
- **Properties**:
  - `source` (string) - 'pricing', 'results', 'profile'
  - `priceId` (string) - Stripe price ID
- **Funnel**: Checkout start

**`checkout_success`**
- **When**: User completes Stripe checkout and returns to success page
- **Properties**:
  - `sessionId` (string) - Stripe session ID (not sensitive)
  - `plan` (string) - 'pro'
- **Funnel**: Conversion!

**`checkout_canceled`**
- **When**: User cancels Stripe checkout
- **Properties**:
  - `sessionId` (string)
- **Funnel**: Checkout abandonment

**`subscription_canceled`**
- **When**: User downgrades to Free from /profile
- **Properties**:
  - `daysSubscribed` (number) - how long they were Pro
  - `reason` (string) - optional if we add exit survey
- **Funnel**: Churn

**`subscription_reactivated`**
- **When**: Canceled user upgrades again
- **Properties**:
  - `daysSinceCanceled` (number)
- **Funnel**: Win-back

---

### Profile Page

**`profile_viewed`**
- **When**: User lands on /profile
- **Properties**:
  - `plan` (string) - 'free' or 'pro_active'
- **Purpose**: Track profile engagement

**`profile_plan_changed`**
- **When**: User successfully changes plan (upgrade/downgrade)
- **Properties**:
  - `fromPlan` (string)
  - `toPlan` (string)
  - `action` (string) - 'upgrade' or 'downgrade'
- **Funnel**: Plan transitions

---

## Event Funnels

### Primary Conversion Funnel
1. `pricing_page_viewed`
2. `pricing_cta_pro`
3. `auth_login_success` (if not logged in)
4. `checkout_initiated`
5. `checkout_success`

### User Activation Funnel
1. `auth_login_success`
2. `find_started`
3. `find_location_set`
4. `find_submitted`
5. `results_viewed`

### Alert Engagement Funnel
1. `results_alert_toggled` (enabled=true)
2. `alert_email_sent`
3. `alert_email_clicked`

---

## Properties Schema

### Common Properties
- `authenticated` (boolean) - whether user is logged in
- `plan` (string) - 'guest', 'free', 'pro_active', 'pro_past_due', 'pro_canceled_effective'
- `source` (string) - where action originated

### Sanitization Rules
- **Never include**: email addresses, full names, user IDs
- **Hash if needed**: Use non-reversible hashing for any identifiers
- **Aggregate**: Use counts, not individual items (e.g., `dogCount` not `dogIds`)

---

## Implementation Notes

1. **Client-side events**: Most events tracked from React components using `trackEvent()`
2. **Server-side events**: Email sends, webhook processing use server-side Umami API
3. **Batching**: Umami automatically batches events for performance
4. **Privacy**: All events sanitized via `lib/analytics/sanitize.ts`
5. **Testing**: Use `NEXT_PUBLIC_FEATURE_ANALYTICS=false` to disable in tests

---

## Umami Dashboard Setup

After events are firing, configure these in Umami:

### Funnels
1. **Primary Conversion**: pricing_page_viewed → pricing_cta_pro → checkout_initiated → checkout_success
2. **User Activation**: auth_login_success → find_started → find_submitted → results_viewed
3. **Alert Engagement**: results_alert_toggled → alert_email_sent → alert_email_clicked

### Goals
- Conversion: `checkout_success`
- Activation: `find_submitted`
- Engagement: `alert_email_clicked`

### Segments
- Free users: `plan=free`
- Pro users: `plan=pro_active`
- Mobile: `screen.width < 768`

