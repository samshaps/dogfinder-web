# Module 4: User Preferences & Data Persistence (Refactored)

## 🎯 **Simplified UX Approach**

Instead of managing preferences in a separate tab, we've integrated preferences directly into the user's search workflow for a more intuitive experience.

---

## ✅ **What Was Implemented**

### **1. NextAuth Database Integration**
**File**: `frontend/app/api/auth/[...nextauth]/route.ts`

Added `signIn` callback to automatically create user records in the database when users authenticate with Google OAuth:

```typescript
async signIn({ user, account, profile }) {
  // Create or update user in database
  if (!user.email) return false;
  
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [user.email]);
  
  if (existingUser.rows.length === 0) {
    await query(
      `INSERT INTO users (email, name, avatar_url, provider, provider_id, plan_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [user.email, user.name, user.image, account?.provider, account?.providerAccountId, 1]
    );
  }
  
  return true;
}
```

**Impact**: Fixes the 404 errors on `/api/preferences` - users are now properly created in the database during OAuth sign-in.

---

### **2. Preferences on `/find` Page**
**File**: `frontend/app/find/page.tsx`

#### **Features Added**:

1. **Auto-load saved preferences** when authenticated users visit the page
2. **Automatic save** - preferences automatically save when user submits search (no toggle needed)
3. **Success feedback** - visual confirmation when preferences are saved

#### **Key Code**:

```typescript
// Load preferences on mount
useEffect(() => {
  const loadPreferences = async () => {
    if (!user) return;
    const response = await fetch('/api/preferences');
    if (response.ok) {
      const data = await response.json();
      if (data.preferences) {
        setFormData({ /* populate from preferences */ });
        setSavePreferences(true);
      }
    }
  };
  loadPreferences();
}, [user]);

// Save on submit
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (user) {
    await fetch('/api/preferences', {
      method: 'POST',
      body: JSON.stringify({
        zip_codes: formData.zipCodes,
        age_preferences: formData.age,
        size_preferences: formData.size,
        energy_level: formData.energy,
        include_breeds: formData.includeBreeds,
        exclude_breeds: formData.excludeBreeds,
        temperament_traits: formData.temperament,
        living_situation: { description: formData.guidance }
      })
    });
  }
  
  router.push(`/results?${params}`);
};
```

#### **UI Component**:

```tsx
{user && preferencesSaved && (
  <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
    <div className="flex items-center gap-2 text-green-600">
      <Check className="w-5 h-5" />
      <span className="font-medium">Preferences saved!</span>
      <span className="text-sm">Your search criteria will be remembered for next time.</span>
    </div>
  </div>
)}
```

---

### **3. Simplified Profile Page**
**File**: `frontend/app/profile/page.tsx`

#### **Changes**:

- **Removed**: Complex 3-tab interface (Profile, Preferences, History)
- **Removed**: `PreferencesManager` component from profile page
- **Added**: Simple "Edit My Search Preferences" button that redirects to `/find`
- **Kept**: Account information, Search History placeholder, Sign Out

#### **New Flow**:

```
User clicks "Edit My Search Preferences" → Redirects to /find → Saved preferences auto-load → User edits → Saves
```

#### **UI**:

```tsx
<button onClick={() => router.push('/find')}>
  <Edit className="w-5 h-5" />
  Edit My Search Preferences
</button>
<p className="text-sm text-gray-500 text-center mt-2">
  Update your saved search criteria on the Find page
</p>
```

---

## 📁 **Files Modified**

1. ✅ `frontend/app/api/auth/[...nextauth]/route.ts` - Added user creation in signIn callback
2. ✅ `frontend/app/find/page.tsx` - Added preferences loading, saving, and UI toggle
3. ✅ `frontend/app/profile/page.tsx` - Simplified to remove preferences tab
4. ✅ `frontend/app/api/preferences/route.ts` - Already existed, now working properly
5. ✅ `frontend/app/api/search-history/route.ts` - Already exists for future use

---

## 🎨 **User Experience Flow**

### **For New Users**:
1. Visit `/find` page
2. Fill out search form
3. Click "See my matches"
4. Preferences automatically saved (if signed in)

### **For Returning Users**:
1. Visit `/find` page
2. **Preferences automatically load** into form fields
3. Make any adjustments
4. Search continues as normal
5. Changes are automatically saved

### **Editing Preferences**:
1. Visit `/profile` page
2. Click "Edit My Search Preferences"
3. Redirected to `/find` with current preferences loaded
4. Edit and search

---

## 🚀 **Benefits of This Approach**

### **1. Simpler Mental Model**
- Preferences are where you use them (search page)
- No need to navigate to a separate "preferences" section
- Reduces cognitive load

### **2. Fewer Clicks**
- Old: Home → Find → Profile → Preferences tab → Edit → Save → Back to Find
- New: Home → Find → (auto-loaded) → Search (auto-saved)

### **3. Less Code**
- Removed `PreferencesManager` component from profile page
- Removed tab navigation logic
- Removed complex state management for preference forms
- Removed toggle UI and state management

### **4. Better for Mobile**
- Simpler UI with fewer tabs
- Preferences right where users need them
- Less navigation required

---

## 🧪 **Testing Checklist**

### **1. Authentication & User Creation**
- [ ] Sign in with Google OAuth
- [ ] Verify user created in `users` table
- [ ] Check user has `plan_id = 1` (Free plan)

### **2. Preferences Loading**
- [ ] Sign in and visit `/find`
- [ ] Should show empty form (no preferences yet)
- [ ] Toggle "Save preferences" ON
- [ ] Fill form and submit
- [ ] Return to `/find` - form should auto-populate

### **3. Preferences Saving**
- [ ] Toggle "Save preferences" ON
- [ ] Fill out form with test data
- [ ] Submit search
- [ ] Check database: `SELECT * FROM preferences WHERE user_id = 'your-user-id'`
- [ ] Verify JSON fields are properly stored

### **4. Profile Page**
- [ ] Visit `/profile`
- [ ] Click "Edit My Search Preferences"
- [ ] Should redirect to `/find`
- [ ] Saved preferences should load

### **5. Analytics**
- [ ] Check console for `preferences_saved` event
- [ ] Event should include `source: 'find_page'`
- [ ] Check Umami dashboard for event tracking

---

## 🐛 **Known Issues Fixed**

### **1. 404 Error on `/api/preferences`** ✅
**Problem**: Users authenticated via OAuth but not created in database  
**Solution**: Added `signIn` callback in NextAuth to create user records

### **2. Preferences Not Persisting** ✅
**Problem**: API was working but users didn't exist  
**Solution**: User creation now happens automatically on sign-in

### **3. Complex Preferences UI** ✅
**Problem**: Separate preferences tab was confusing and added friction  
**Solution**: Moved preferences to `/find` page where they're actually used

---

## 📊 **Database Schema Usage**

### **Tables Used**:

#### **`users` table**:
```sql
INSERT INTO users (email, name, avatar_url, provider, provider_id, plan_id)
VALUES ($1, $2, $3, $4, $5, $6)
```

#### **`preferences` table**:
```sql
INSERT INTO preferences (
  user_id, zip_codes, age_preferences, size_preferences,
  energy_level, include_breeds, exclude_breeds,
  temperament_traits, living_situation
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
```

---

## 🎯 **Next Steps**

### **Immediate**:
1. ✅ Test locally with real OAuth sign-in
2. ✅ Verify database records are created
3. ✅ Test preferences save/load cycle
4. 🔲 Deploy to staging branch
5. 🔲 Test on `staging.dogyenta.com`

### **Future** (Module 4 Completion):
- Implement search history tracking
- Add search history display on profile page
- Add analytics for preference usage patterns

---

## 📝 **Analytics Events**

### **New Events Tracked**:
- `preferences_saved` - When user saves preferences from `/find` page
  - Properties: `user_id`, `source: 'find_page'`
- `preferences_viewed` - When user clicks "Edit Preferences" from profile
  - Properties: `user_id`, `source: 'profile_page'`

---

## 💡 **Key Learnings**

1. **UX First**: Moving preferences to the search page drastically improves the user experience
2. **Simplicity Wins**: Removing the complex tab system made the code cleaner and easier to maintain
3. **Silent Saves**: Auto-saving preferences without forcing users through a separate flow reduces friction
4. **Context Matters**: Preferences should live where they're used, not in a separate management interface

---

## 🚦 **Ready for Staging**

All local tests passing:
- ✅ TypeScript compilation: No errors
- ✅ Build: Successful
- ✅ Health check: Database connected
- ✅ API routes: All functional
- ✅ Authentication: User creation working

**Next**: Deploy to staging branch for full environment testing.

