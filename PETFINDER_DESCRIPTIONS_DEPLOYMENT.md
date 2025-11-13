# PetFinder Descriptions Integration - Deployment Checklist

## Pre-Deployment Steps

### 1. Database Migration (CRITICAL - Do First)
**Action**: Run SQL migration in Supabase staging database

**Location**: Supabase Dashboard → SQL Editor → New Query

**SQL to Execute**:
```sql
-- Add traits_inferred column to dog_cache table
ALTER TABLE dog_cache 
ADD COLUMN IF NOT EXISTS traits_inferred JSONB;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_dog_cache_petfinder_id 
ON dog_cache(petfinder_id);

-- Add documentation comment
COMMENT ON COLUMN dog_cache.traits_inferred IS 'AI-inferred traits from PetFinder descriptions. Format: [{trait: string, value: any, probability: number, source: string, updated_at: timestamp}]';
```

**Verification Query**:
```sql
-- Verify column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'dog_cache' AND column_name = 'traits_inferred';
-- Expected: traits_inferred | jsonb | YES
```

**Status**: ☐ Migration executed | ☐ Verified

---

### 2. Environment Variables Check

**Vercel Staging Environment** → Settings → Environment Variables

**Required Variables** (verify all are set):
- [ ] `OPENAI_API_KEY` - Must be valid and have credits
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Points to staging database
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Has write access to `dog_cache` table
- [ ] `NEXT_PUBLIC_FEATURE_MATCH_USE_INFERRED_TRAITS` - Set to `false` initially (V2 disabled)

**Optional V2 Variables** (set after V1 is verified):
- [ ] `INFERENCE_CONFIDENCE_THRESHOLD` - Default: `0.75`
- [ ] `MAX_BONUS_PER_TRAIT` - Default: `2.0`
- [ ] `MAX_TOTAL_INFERRED_BONUS` - Default: `5.0`

**Status**: ☐ All variables verified

---

### 3. Code Review & Commit

**Files Changed**:
- `frontend/lib/utils/description-sanitizer.ts` (NEW)
- `frontend/lib/api.ts` (MODIFIED)
- `frontend/lib/explanation.ts` (MODIFIED)
- `frontend/lib/schemas.ts` (MODIFIED)
- `frontend/lib/scoring.ts` (MODIFIED)
- `frontend/lib/matching-flow.ts` (MODIFIED)
- `frontend/lib/featureFlags.ts` (MODIFIED)
- `frontend/app/api/dogs/route.ts` (MODIFIED)
- `frontend/app/results/page.tsx` (MODIFIED)
- `frontend/lib/config/inference-config.ts` (NEW)
- `frontend/lib/inference/trait-inference.ts` (NEW)
- `frontend/lib/inference/trait-storage.ts` (NEW)
- `frontend/migrations/add_traits_inferred.sql` (NEW)

**Commit Message Suggestion**:
```
feat: Add PetFinder descriptions integration (V1 + V2)

V1: Description-enhanced AI recommendations
- Extract and sanitize PetFinder descriptions
- Use descriptions as context in AI-generated recommendations
- Add observability logging for description usage

V2: Inferred trait bonuses (feature-flagged)
- Batch inference of traits from descriptions
- Store inferred traits in dog_cache.traits_inferred
- Apply bounded scoring bonuses when traits match preferences
- Feature flag: NEXT_PUBLIC_FEATURE_MATCH_USE_INFERRED_TRAITS

Database migration required: See migrations/add_traits_inferred.sql
```

**Status**: ☐ Code reviewed | ☐ Committed | ☐ Pushed to staging branch

---

### 4. Deploy to Staging

**Method 1: Automatic (if Vercel is connected to staging branch)**
- Push to `staging` branch triggers automatic deployment
- Monitor deployment in Vercel dashboard

**Method 2: Manual Deploy**
1. Go to Vercel Dashboard
2. Select project
3. Go to Deployments tab
4. Click "Redeploy" on latest staging deployment
5. Or: Connect GitHub and push to staging branch

**Monitor Deployment**:
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] No build warnings
- [ ] Functions deploy successfully
- [ ] Deployment URL is accessible

**Status**: ☐ Deployed | ☐ Build successful | ☐ No errors

---

## Post-Deployment Verification

### 5. Health Check

**Test Endpoint**:
```bash
curl https://staging.dogyenta.com/api/health
```

**Expected**: `{ "status": "ok" }` or similar

**Status**: ☐ Health check passes

---

### 6. Quick Smoke Test

**Test Description Extraction**:
1. Visit: `https://staging.dogyenta.com/find`
2. Enter search: ZIP `10001`, radius `50`
3. Submit search
4. Open DevTools → Network → Find `/api/dogs` request
5. Check response includes `description` fields

**Expected**: At least some dogs have `description` field populated

**Status**: ☐ Smoke test passes

---

## Testing Phase

**Next Step**: Execute comprehensive test plan
**Document**: `docs/PETFINDER_DESCRIPTIONS_TEST_PLAN.md`

**Priority Order**:
1. ✅ V1 Tests (Tests 1-5) - Verify description extraction and AI usage
2. ⏸️ V2 Tests (Tests 6-12) - Only after V1 is verified and stable
3. ✅ Integration Tests (Tests 13-15)
4. ✅ Regression Tests (Tests 16-17)

---

## Rollback Plan

### If Critical Issues Found:

**Code Rollback**:
1. Go to Vercel Dashboard → Deployments
2. Find previous stable deployment
3. Click "Promote to Production" (or redeploy that version)
4. Verify functionality restored

**Database Rollback** (only if absolutely necessary):
```sql
-- WARNING: This will delete all inferred traits data
ALTER TABLE dog_cache DROP COLUMN IF EXISTS traits_inferred;
DROP INDEX IF EXISTS idx_dog_cache_petfinder_id;
```

**Note**: V1 changes are additive (descriptions don't break existing functionality), so rollback may not be necessary unless critical bugs found.

---

## Success Criteria

### V1 Deployment Success:
- [ ] Descriptions extracted from PetFinder
- [ ] Descriptions sanitized correctly
- [ ] AI recommendations use description context
- [ ] No increase in errors
- [ ] No performance degradation
- [ ] Existing functionality unchanged

### V2 Enablement (After V1 Stable):
- [ ] Feature flag works correctly
- [ ] Traits inferred and stored
- [ ] Bonuses applied correctly
- [ ] Rankings change modestly
- [ ] Flag toggle returns to baseline

---

## Deployment Log

**Date**: _______________
**Deployed By**: _______________
**Version/Commit**: _______________
**Database Migration**: ☐ Applied | ☐ Verified
**Environment Variables**: ☐ Verified
**Deployment Status**: ☐ Success | ☐ Failed | ☐ Rolled Back

**Notes**:
_________________________________________________________________
_________________________________________________________________

