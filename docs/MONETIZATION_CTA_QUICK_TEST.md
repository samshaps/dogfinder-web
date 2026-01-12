# Monetization CTA - Quick Test Guide

**Quick reference for testing the monetization CTA implementation on staging.**

---

## 🚀 Deployment Status

✅ **Code pushed to staging branch**  
✅ **Vercel should auto-deploy** (check Vercel dashboard)

**Staging URL:** Check your Vercel dashboard for staging URL (typically `staging.dogyenta.com` or preview URL)

---

## 🧪 Quick Test Scenarios

### Scenario 1: Signed-Out User Flow (5 min)
1. Open staging site in **incognito/private window**
2. Go to `/find` page
   - ✅ Verify NO Pro/upgrade banners
   - ✅ Verify "What happens next" copy above submit button
3. Fill form (zip: `94102`) and submit
4. On `/results` page:
   - ✅ Verify above-the-fold CTA appears below "Found X dogs"
   - ✅ Click "Turn on alerts – $9.99/month"
   - ✅ Should redirect to sign-in
5. Sign in with Google
6. Should return to `/results` with CTA still visible
7. Click CTA again → Should go to Stripe checkout

### Scenario 2: Free User Flow (3 min)
1. Sign in as **free user** (or create test account)
2. Go to `/find` → Verify no monetization
3. Submit search → Go to `/results`
4. ✅ Verify top CTA visible
5. Scroll to "All Matches" → ✅ Verify inline CTA after 3rd dog
6. Click either CTA → Should go to Stripe checkout
7. Use test card: `4242 4242 4242 4242`
8. Complete checkout → Should upgrade to Pro

### Scenario 3: Pro User (No CTAs) (2 min)
1. Sign in as **Pro user** (or upgrade test account)
2. Go to `/results`
3. ✅ Verify NO CTAs visible (top or inline)
4. ✅ Results display normally

---

## 🔍 Key Things to Check

### `/find` Page
- [ ] No Pro banners or upgrade buttons
- [ ] "What happens next" informational copy visible
- [ ] Submit button says "See my matches"

### `/results` Page - Signed-Out/Free Users
- [ ] Above-the-fold CTA below header
- [ ] CTA copy matches PRD:
  - Headline: "You're seeing dogs available right now"
  - Body: "New rescue dogs that match your preferences appear unpredictably..."
  - Button: "Turn on alerts – $9.99/month"
- [ ] Inline CTA after 3rd dog card
- [ ] Inline CTA copy: "These dogs are available now. New matches appear every week."
- [ ] Clicking CTAs triggers correct flow (sign-in or checkout)

### `/results` Page - Pro Users
- [ ] NO CTAs visible (top or inline)
- [ ] Results display normally

### Analytics (DevTools → Network)
- [ ] `alerts_cta_clicked` events fire with `location: 'top'` or `'inline'`
- [ ] `stripe_checkout_started` fires when checkout begins

---

## 🐛 Common Issues to Watch For

1. **CTAs showing for Pro users** → Check `canViewPrefs(planInfo)` logic
2. **Sign-in doesn't preserve URL** → Check callback URL encoding
3. **Checkout doesn't trigger** → Check Stripe API endpoint
4. **Inline CTA breaks grid layout** → Check `col-span-full` CSS
5. **Analytics not firing** → Check Umami integration

---

## 📊 Test Data

**Test Zip Codes:**
- `94102` (San Francisco)
- `10001` (New York)
- `90210` (Beverly Hills)

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Failure: `4000 0000 0000 0002`

**Test Accounts:**
- Create free account via Google OAuth
- Upgrade to Pro via Stripe checkout (test mode)

---

## ✅ Success Criteria

- [ ] No monetization on `/find` page
- [ ] CTAs appear on `/results` for free/signed-out users only
- [ ] Sign-in flow preserves callback URL
- [ ] Stripe checkout works from results page
- [ ] Analytics events tracked correctly
- [ ] Pro users don't see CTAs

---

## 📝 Report Issues

If you find issues, note:
1. **User type** (signed-out, free, Pro)
2. **Page** (`/find` or `/results`)
3. **CTA location** (top or inline)
4. **Steps to reproduce**
5. **Expected vs actual behavior**
6. **Screenshots** (if applicable)

---

**Happy Testing! 🎉**

