# V1 Testing Notes & Issues

## Summary of Test Results

### ✅ Passing Tests
- **Test 1**: Description extraction and sanitization - ✅ PASS
- **Test 4**: Sanitization edge cases - ✅ PASS  
- **Test 5**: Observability logging - ✅ PASS (logs in Vercel, not browser console - expected)

### ⚠️ Issues Found

#### Issue 1: API Still Calling Render.com
**Problem**: Frontend is still making API calls to `https://dogfinder-web-staging.onrender.com/api/dogs` instead of using the local Next.js API routes.

**Root Cause**: `NEXT_PUBLIC_API_BASE` environment variable is likely set to the Render URL in Vercel staging environment.

**Location**: `frontend/lib/api.ts` line 7:
```typescript
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || (process.env.NODE_ENV !== 'production' ? DEV_DEFAULT_BASE : '');
```

**Fix Required**: 
1. Remove or unset `NEXT_PUBLIC_API_BASE` in Vercel staging environment variables
2. The code already has fallback logic to use relative URLs when `API_BASE` is empty
3. Since we're using Next.js API routes (`/api/dogs`), we don't need an external API base URL

**Action Items**:
- [ ] Check Vercel staging environment variables for `NEXT_PUBLIC_API_BASE`
- [ ] Remove or set to empty string
- [ ] Verify API calls now go to `staging.dogyenta.com/api/dogs` instead of Render

#### Issue 2: Cannot Verify Test 2 (AI Using Descriptions)
**Problem**: Cannot verify that AI recommendations are actually using the description context, even though all three recommended dogs had descriptions.

**Possible Causes**:
1. AI prompt might not be effectively using the description
2. Need better observability to see what the AI actually received
3. Descriptions might be present but not influencing the output

**Investigation Needed**:
- [ ] Add debug logging to show the full prompt sent to AI (including description)
- [ ] Compare AI output with/without descriptions for same dogs
- [ ] Check if descriptions are being truncated or filtered out before reaching AI
- [ ] Verify the prompt structure in `createTop3Prompt()` is correctly including descriptions

**Action Items**:
- [ ] Add `DEBUG_REASONING=1` query param support to see full prompts
- [ ] Add logging to show description snippet that's included in prompt
- [ ] Manually test with a dog that has a very distinctive description to see if it appears in output

#### Issue 3: Cannot Verify Test 3 (Dogs Without Descriptions)
**Problem**: All three recommended dogs had descriptions, so couldn't test the fallback behavior.

**Status**: This is a test coverage limitation, not a bug. The code should handle missing descriptions gracefully.

**Action Items**:
- [ ] Find dogs without descriptions in the search results
- [ ] Manually test with dogs that have no PetFinder description
- [ ] Verify AI recommendations still generate (using breed characteristics fallback)

### 📝 Notes

#### Console Logs in Vercel vs Browser
**Observation**: Description usage logs appear in Vercel logs but not browser console.

**Explanation**: This is **expected behavior**. The `generateTop3Reasoning()` function runs on the server (Next.js API route or server component), so `console.log` statements appear in server-side logs (Vercel), not the browser console.

**Browser console logs** would only show:
- Client-side JavaScript logs
- Network request logs (which you can see in Network tab)

**Server-side logs** (Vercel) show:
- API route execution logs
- Server component logs
- Any `console.log` from server-side code

This is correct and working as designed.

## Recommended Next Steps

### Priority 1: Fix API Base URL
1. Remove `NEXT_PUBLIC_API_BASE` from Vercel staging environment
2. Verify API calls use local Next.js routes
3. Test that `/api/dogs` endpoint works correctly

### Priority 2: Improve Test 2 Observability
1. Add debug mode to show full AI prompts
2. Add logging for description inclusion in prompts
3. Test with distinctive descriptions to verify usage

### Priority 3: Test Missing Descriptions
1. Find dogs without descriptions
2. Verify fallback behavior works correctly

## Code Changes Needed

### 1. Remove API_BASE Dependency (if not needed)
If we're fully on Next.js API routes, we can simplify `lib/api.ts` to always use relative URLs.

### 2. Add Debug Mode for AI Prompts
Enhance `lib/explanation.ts` to log full prompts when debug mode is enabled.

### 3. Add Description Usage Tracking
Track whether descriptions were actually included in the prompt sent to AI.

