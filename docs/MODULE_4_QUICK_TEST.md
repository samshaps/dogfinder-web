# Module 4 Quick Test Guide

## 🚀 **5-Minute Test Plan**

### **Prerequisites**
- ✅ Servers running on `localhost:3000` and `localhost:8000`
- ✅ Database connected (check `/api/health`)
- ✅ Google OAuth configured in `.env.local`

---

## **Test 1: Sign In & User Creation** (2 min)

1. Open `http://localhost:3000/auth/signin`
2. Click "Continue with Google"
3. Complete OAuth flow
4. Should redirect to home page
5. Check navigation - should see "Profile" and "Sign Out" links

**Expected Result**: ✅ User created in database, authenticated session

**Verify in database**:
```bash
psql postgresql://dogfinder:dogfinder_dev@localhost:5433/dogfinder_dev \
  -c "SELECT id, email, name, provider FROM users;"
```

---

## **Test 2: Preferences Save** (2 min)

1. Visit `http://localhost:3000/find`
2. Fill out form:
   - Add ZIP code: `10001` (press Enter)
   - Select Age: `adult`
   - Select Size: `medium`
   - Select Energy: `medium`
3. Click "See my matches"

**Expected Result**: 
- ✅ Green "Preferences saved!" message appears briefly
- ✅ Redirects to results page
- ✅ Preferences saved in database

**Check console**: Should see `✅ Preferences saved`

**Verify in database**:
```bash
psql postgresql://dogfinder:dogfinder_dev@localhost:5433/dogfinder_dev \
  -c "SELECT user_id, zip_codes, age_preferences, size_preferences, energy_level FROM preferences;"
```

---

## **Test 3: Preferences Auto-Load** (1 min)

1. Visit `http://localhost:3000/find` again
2. **Should see**:
   - ZIP code `10001` already in the list
   - Age `adult` selected
   - Size `medium` selected
   - Energy `medium` selected

**Expected Result**: ✅ Preferences automatically loaded from database

**Check console**: Should see `✅ Loaded saved preferences`

---

## **Test 4: Profile Page Redirect** (30 sec)

1. Visit `http://localhost:3000/profile`
2. Should see:
   - Your name and email
   - "Edit My Search Preferences" button (blue)
3. Click "Edit My Search Preferences"
4. Should redirect to `/find` with preferences loaded

**Expected Result**: ✅ Simple profile page, preferences editing works via redirect

---

## **Test 5: Analytics Events** (30 sec)

1. Open browser console
2. Visit `/find` page
3. Submit search (preferences auto-save)
4. Visit `/profile`
5. Click "Edit My Search Preferences"

**Expected Result**: Check console for:
- ✅ Umami events tracked
- ✅ `preferences_saved` event
- ✅ `preferences_viewed` event

---

## **Quick Verification Commands**

### **Check if servers are running**:
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok","database":"connected"...}
```

### **Check users table**:
```bash
psql postgresql://dogfinder:dogfinder_dev@localhost:5433/dogfinder_dev \
  -c "SELECT COUNT(*) as user_count FROM users;"
```

### **Check preferences table**:
```bash
psql postgresql://dogfinder:dogfinder_dev@localhost:5433/dogfinder_dev \
  -c "SELECT COUNT(*) as prefs_count FROM preferences;"
```

### **View your preferences**:
```bash
psql postgresql://dogfinder:dogfinder_dev@localhost:5433/dogfinder_dev \
  -c "SELECT p.* FROM preferences p JOIN users u ON p.user_id = u.id WHERE u.email = 'your-email@example.com';"
```

---

## ✅ **Success Criteria**

All of these should be TRUE:
- [ ] Can sign in with Google OAuth
- [ ] User record created in database
- [ ] Preferences automatically save to database when authenticated
- [ ] Preferences auto-load on return visit to `/find`
- [ ] Profile page has "Edit My Search Preferences" button
- [ ] Button redirects to `/find` page
- [ ] No TypeScript errors in console
- [ ] No 404 errors on `/api/preferences`

---

## 🐛 **Common Issues**

### **Issue: 404 on `/api/preferences`**
**Cause**: User not in database  
**Fix**: Sign out and sign in again (signIn callback will create user)

### **Issue: Preferences not saving**
**Cause**: User not authenticated  
**Fix**: Sign in with Google OAuth first

### **Issue: Database connection error**
**Cause**: Postgres not running  
**Fix**: `docker-compose up -d` in frontend directory

### **Issue: OAuth redirect loop**
**Cause**: `NEXTAUTH_SECRET` not set  
**Fix**: Add to `.env.local` and restart server

---

## 🎯 **Next Steps**

Once all tests pass:
1. ✅ Mark "Test refactored Module 4 locally" as complete
2. 🚀 Push to staging branch
3. 🧪 Test on `staging.dogyenta.com`
4. 📝 Document any staging-specific issues
5. 🎉 Merge to main when ready for production

---

## 📊 **Test Results Template**

Copy and fill out:

```
Date: ____________________
Tester: __________________

✅ / ❌  Test 1: Sign In & User Creation
✅ / ❌  Test 2: Preferences Save
✅ / ❌  Test 3: Preferences Auto-Load
✅ / ❌  Test 4: Profile Page Redirect
✅ / ❌  Test 5: Analytics Events

Issues found:
- 
- 
- 

Notes:
```

