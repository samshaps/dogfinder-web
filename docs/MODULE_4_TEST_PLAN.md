# Module 4 Local Testing Plan

## 🧪 **Test Scenarios for User Preferences & Data Persistence**

### **Prerequisites:**
- Servers running: ✅ `http://localhost:3000` (Frontend) + `http://localhost:8000` (Backend)
- Database connected: ✅ Health check shows "database": "connected"
- User authenticated: Need to sign in with Google OAuth

---

## **Test 1: Authentication Flow**
**URL**: `http://localhost:3000/auth/signin`

- [ ] **Sign-in page loads** without React Context errors
- [ ] **Google OAuth works** - click "Continue with Google"
- [ ] **Redirect to profile** after successful authentication
- [ ] **Navigation shows** "Profile" and "Sign Out" links

---

## **Test 2: Profile Page - New Tabbed Interface**
**URL**: `http://localhost:3000/profile`

- [ ] **Profile tab loads** with user information (name, email, provider)
- [ ] **Preferences tab** shows the new PreferencesManager component
- [ ] **History tab** shows placeholder for search history
- [ ] **Tab switching works** smoothly between tabs

---

## **Test 3: Preferences Management**
**Location**: Profile page → Preferences tab

- [ ] **Preferences form loads** without errors
- [ ] **Add ZIP codes** - enter valid 5-digit codes
- [ ] **Age preferences** - select puppy, young, adult, senior
- [ ] **Size preferences** - select small, medium, large
- [ ] **Energy level** - select low, medium, high
- [ ] **Living situation** - check/uncheck yard, children, other pets
- [ ] **Notifications** - toggle email alerts and frequency
- [ ] **Save preferences** - click "Save Preferences" button
- [ ] **Success feedback** - preferences save successfully

---

## **Test 4: API Endpoints**
**Test the new API routes directly:**

### **GET /api/preferences**
```bash
curl -H "Cookie: $(curl -s http://localhost:3000/api/auth/session | jq -r '.cookies')" \
  http://localhost:3000/api/preferences
```
- [ ] **Returns user preferences** or "No preferences found"
- [ ] **Proper authentication** - 401 if not logged in

### **POST /api/preferences**
```bash
curl -X POST -H "Content-Type: application/json" \
  -H "Cookie: $(curl -s http://localhost:3000/api/auth/session | jq -r '.cookies')" \
  -d '{"zip_codes":["12345"],"age_preferences":["puppy"],"energy_level":"high"}' \
  http://localhost:3000/api/preferences
```
- [ ] **Creates/updates preferences** successfully
- [ ] **Validation works** - rejects invalid data

### **GET /api/search-history**
```bash
curl -H "Cookie: $(curl -s http://localhost:3000/api/auth/session | jq -r '.cookies')" \
  http://localhost:3000/api/search-history
```
- [ ] **Returns search history** (may be empty initially)
- [ ] **Proper authentication** - 401 if not logged in

---

## **Test 5: Analytics Integration**
**Check browser console for analytics events:**

- [ ] **`profile_viewed`** when visiting profile page
- [ ] **`preferences_saved`** when saving preferences
- [ ] **Analytics events** include proper data (no PII)

---

## **Test 6: Database Integration**
**Check database directly:**

```bash
# Connect to local Postgres
psql postgresql://dogfinder:dogfinder_dev@localhost:5433/dogfinder_dev

# Check users table
SELECT id, email, name FROM users WHERE email = 'your-email@example.com';

# Check preferences table
SELECT * FROM preferences WHERE user_id = 'user-uuid';

# Check if preferences are properly stored as JSON
SELECT zip_codes, age_preferences, energy_level FROM preferences;
```

- [ ] **User record exists** after OAuth login
- [ ] **Preferences saved** to database
- [ ] **JSON fields** properly formatted

---

## **Test 7: Error Handling**
**Test error scenarios:**

- [ ] **Unauthenticated access** to `/profile` redirects to sign-in
- [ ] **Invalid preferences data** shows validation errors
- [ ] **Network errors** handled gracefully
- [ ] **Database errors** don't crash the app

---

## **Test 8: Mobile Responsiveness**
**Test on mobile viewport:**

- [ ] **Preferences form** works on mobile
- [ ] **Tab navigation** works on mobile
- [ ] **Form controls** are touch-friendly

---

## **Expected Results:**

### **✅ Success Indicators:**
- All tabs load without errors
- Preferences save successfully to database
- Analytics events fire correctly
- Form validation works properly
- Mobile experience is smooth

### **🚨 Failure Indicators:**
- TypeScript errors in console
- Database connection failures
- Authentication redirect loops
- Form submission failures
- Missing analytics events

---

## **Next Steps After Testing:**
1. **Fix any issues** found during local testing
2. **Commit fixes** to the feature branch
3. **Deploy to staging** for full environment testing
4. **Test on staging.dogyenta.com** with real OAuth credentials
5. **Complete Module 4** with search history UI

---

## **Quick Test Commands:**

```bash
# Test build
cd frontend && npm run build

# Test TypeScript
npm run typecheck

# Test health
curl http://localhost:3000/api/health

# Start servers
./scripts/start-servers.sh

# Test profile page
open http://localhost:3000/profile
```
