# Module 3 Test Criteria: Authentication & User Management

## 🎯 Test Scenarios

### 1. Sign-In Page Functionality
**URL**: `http://localhost:3000/auth/signin`

#### ✅ Test Cases:
- [ ] **Page loads correctly** - No React Context errors, beautiful UI displays
- [ ] **Google OAuth button visible** - "Continue with Google" button with proper styling
- [ ] **Responsive design** - Works on mobile and desktop
- [ ] **Analytics tracking** - `auth_page_viewed` event fires in console
- [ ] **No console errors** - Clean browser console

#### 🔍 Expected Behavior:
```
📊 Tracking event: auth_page_viewed { source: "direct", authenticated: false }
```

---

### 2. Google OAuth Flow
**Flow**: Click "Continue with Google" → OAuth popup/redirect → Return to app

#### ✅ Test Cases:
- [ ] **OAuth popup/redirect opens** - Google sign-in interface appears
- [ ] **Successful authentication** - User completes Google OAuth
- [ ] **Redirect after login** - Returns to `/` (homepage) or intended destination
- [ ] **Analytics tracking** - `auth_login_clicked` and `auth_login_success` events
- [ ] **Session established** - User stays logged in across page refreshes

#### 🔍 Expected Behavior:
```
📊 Tracking event: auth_login_clicked { provider: "google", source: "signin_page" }
📊 Tracking event: auth_login_success { provider: "google", user_id: "user@example.com" }
```

---

### 3. Navigation Authentication State
**Test**: Navigation bar updates based on authentication status

#### ✅ Test Cases:
- [ ] **Unauthenticated state** - Shows "Sign In" button in navigation
- [ ] **Authenticated state** - Shows "Profile" and "Sign Out" links
- [ ] **Mobile navigation** - Hamburger menu works with auth links
- [ ] **Link functionality** - All navigation links work correctly

#### 🔍 Expected Behavior:
- **Not logged in**: Navigation shows "Sign In" button
- **Logged in**: Navigation shows "Profile" and "Sign Out" links

---

### 4. Protected Route: Profile Page
**URL**: `http://localhost:3000/profile`

#### ✅ Test Cases:
- [ ] **Unauthenticated access** - Redirects to `/auth/signin`
- [ ] **Authenticated access** - Shows profile page with user info
- [ ] **User data display** - Name, email, provider shown correctly
- [ ] **Profile image** - Google profile picture displays (if available)
- [ ] **Analytics tracking** - `profile_viewed` and `auth_protected_route_accessed` events
- [ ] **Loading state** - Shows spinner while checking authentication

#### 🔍 Expected Behavior:
```
📊 Tracking event: auth_protected_route_accessed { redirect_to: "/auth/signin", authenticated: false }
📊 Tracking event: profile_viewed { authenticated: true, user_id: "user@example.com" }
```

---

### 5. Sign-Out Functionality
**Flow**: Click "Sign Out" → Confirm logout → Redirect to home

#### ✅ Test Cases:
- [ ] **Sign out button works** - Available in navigation and profile page
- [ ] **Session cleared** - User becomes unauthenticated
- [ ] **Redirect to home** - Returns to homepage after logout
- [ ] **Navigation updates** - Shows "Sign In" button again
- [ ] **Analytics tracking** - `auth_logout` event fires
- [ ] **Protected routes blocked** - Can't access `/profile` after logout

#### 🔍 Expected Behavior:
```
📊 Tracking event: auth_logout { user_id: "user@example.com" }
```

---

### 6. Session Persistence
**Test**: User stays logged in across browser sessions

#### ✅ Test Cases:
- [ ] **Page refresh** - User stays authenticated after F5
- [ ] **New tab** - Authentication persists in new browser tab
- [ ] **Browser restart** - Session maintained (if cookies enabled)
- [ ] **30-day expiration** - Session expires after configured time

---

### 7. Error Handling
**Test**: Graceful handling of authentication errors

#### ✅ Test Cases:
- [ ] **Invalid OAuth** - Graceful error handling if Google OAuth fails
- [ ] **Network issues** - Proper error messages for connection problems
- [ ] **Missing env vars** - Clear error if Google credentials not configured
- [ ] **Error boundaries** - Authentication errors don't crash the app

---

### 8. Analytics Integration
**Test**: All authentication events properly tracked

#### ✅ Test Cases:
- [ ] **Event queuing** - Events queued before Umami loads
- [ ] **PII sanitization** - User emails/IDs sanitized in analytics
- [ ] **Event processing** - Queued events sent when Umami ready
- [ ] **Development logging** - Console logs show tracking events

#### 🔍 Expected Events:
```typescript
// All these events should appear in console (development):
auth_page_viewed
auth_login_clicked
auth_login_success
auth_logout
auth_logout_clicked
auth_protected_route_accessed
profile_viewed
```

---

## 🧪 Manual Testing Checklist

### Pre-Test Setup:
- [ ] Environment variables configured in `.env.local`
- [ ] Google OAuth credentials set up
- [ ] Servers running (`./scripts/start-servers.sh`)
- [ ] Database connected (health check passes)

### Test Execution:
1. **Start Unauthenticated**
   - [ ] Visit `http://localhost:3000/auth/signin`
   - [ ] Verify page loads without errors
   - [ ] Check navigation shows "Sign In" button

2. **Complete Authentication**
   - [ ] Click "Continue with Google"
   - [ ] Complete OAuth flow
   - [ ] Verify redirect to homepage

3. **Test Authenticated State**
   - [ ] Check navigation shows "Profile" and "Sign Out"
   - [ ] Visit `/profile` page
   - [ ] Verify user information displays

4. **Test Sign Out**
   - [ ] Click "Sign Out" in navigation
   - [ ] Verify redirect to homepage
   - [ ] Check navigation shows "Sign In" button

5. **Test Protected Routes**
   - [ ] Try to visit `/profile` without authentication
   - [ ] Verify redirect to sign-in page
   - [ ] Complete authentication and verify access

### Post-Test Verification:
- [ ] All analytics events logged in console
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No console errors in browser
- [ ] Mobile responsiveness works

---

## 🚨 Common Issues & Solutions

### Issue: "React Context is unavailable in Server Components"
**Solution**: Ensure `AuthProviders` component has `"use client"` directive

### Issue: "NEXTAUTH_URL not configured"
**Solution**: Add `NEXTAUTH_URL=http://localhost:3000` to `.env.local`

### Issue: Google OAuth not working
**Solution**: Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

### Issue: Analytics events not firing
**Solution**: Check Umami configuration and ensure `NEXT_PUBLIC_UMAMI_*` vars are set

---

## ✅ Success Criteria

**Module 3 is complete when:**
- [ ] All test cases pass
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Analytics events tracking properly
- [ ] User can sign in, access profile, and sign out
- [ ] Protected routes work correctly
- [ ] Mobile and desktop responsive design works

**Ready for Module 4**: User Preferences & Data Persistence 🚀
