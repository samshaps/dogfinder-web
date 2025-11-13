# PetFinder Descriptions Integration - Staging Test Plan

## Overview
This test plan covers both V1 (description-enhanced AI copy) and V2 (inferred trait bonuses) features for the PetFinder descriptions integration.

**Status**: V1 Ready for Deployment | V2 Feature-Flagged (OFF by default)

---

## Pre-Deployment Checklist

### 1. Database Migration
**Action Required**: Run SQL migration in Supabase staging database

```sql
-- Run this in Supabase SQL Editor for staging database
ALTER TABLE dog_cache 
ADD COLUMN IF NOT EXISTS traits_inferred JSONB;

CREATE INDEX IF NOT EXISTS idx_dog_cache_petfinder_id 
ON dog_cache(petfinder_id);

COMMENT ON COLUMN dog_cache.traits_inferred IS 'AI-inferred traits from PetFinder descriptions. Format: [{trait: string, value: any, probability: number, source: string, updated_at: timestamp}]';
```

**Verification**:
```sql
-- Verify column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'dog_cache' AND column_name = 'traits_inferred';

-- Should return: traits_inferred | jsonb
```

### 2. Environment Variables
**Verify in Vercel Staging Environment**:
- [ ] `OPENAI_API_KEY` is set and valid
- [ ] `NEXT_PUBLIC_SUPABASE_URL` points to staging database
- [ ] `SUPABASE_SERVICE_ROLE_KEY` has write access to `dog_cache` table
- [ ] `NEXT_PUBLIC_FEATURE_MATCH_USE_INFERRED_TRAITS=false` (V2 disabled initially)

**Optional V2 Configuration** (set after V1 is verified):
- [ ] `INFERENCE_CONFIDENCE_THRESHOLD=0.75` (default)
- [ ] `MAX_BONUS_PER_TRAIT=2.0` (default)
- [ ] `MAX_TOTAL_INFERRED_BONUS=5.0` (default)

### 3. Code Deployment
**Deploy to Staging**:
```bash
# Ensure you're on the correct branch
git checkout staging
git pull origin staging

# Verify changes are present
git log --oneline -5

# Push to trigger Vercel deployment
git push origin staging
```

**Monitor Deployment**:
- [ ] Check Vercel deployment logs for build success
- [ ] Verify no TypeScript errors
- [ ] Check function build logs for any warnings

---

## V1 Testing: Description-Enhanced AI Copy

### Test 1: Description Extraction & Sanitization

**Objective**: Verify PetFinder descriptions are extracted and sanitized correctly

**Steps**:
1. Navigate to `/find` page
2. Enter search criteria (e.g., ZIP: 10001, radius: 50mi)
3. Submit search
4. Open browser DevTools → Network tab
5. Find `/api/dogs` request
6. Inspect response payload

**Expected Results**:
- [ ] Response includes `description` field for dogs that have PetFinder descriptions
- [ ] Descriptions are plain text (no HTML tags)
- [ ] Descriptions are capped at 1,500 characters
- [ ] No email addresses or phone numbers in descriptions
- [ ] Descriptions are normalized (no excessive whitespace)

**Manual Verification**:
```javascript
// In browser console on results page
const dogs = await fetch('/api/dogs?zip=10001&radius=50').then(r => r.json());
const withDesc = dogs.items.filter(d => d.description);
console.log('Dogs with descriptions:', withDesc.length);
console.log('Sample description:', withDesc[0]?.description?.substring(0, 100));
```

### Test 2: Description in AI-Generated Recommendations

**Objective**: Verify descriptions are used as context in AI-generated recommendation text

**Steps**:
1. Perform a search that returns dogs with descriptions
2. Wait for matching to complete
3. Check top 3 recommendations
4. Open browser DevTools → Console
5. Look for `[reasoning] Using shelter description` logs

**Expected Results**:
- [ ] Console shows logs when descriptions are used
- [ ] Log includes: `dogId`, `descriptionLength`, `snippet`, `hash`
- [ ] AI-generated recommendations reference specific facts from descriptions
- [ ] Recommendations don't copy descriptions verbatim
- [ ] Recommendations are grounded in description or structured traits

**Manual Verification**:
```javascript
// Check console logs
// Should see: [reasoning] Using shelter description { dogId: "...", descriptionLength: 234, ... }
```

**Qualitative Check**:
- [ ] Recommendation text mentions specific training cues, demeanor, or compatibility notes
- [ ] Text feels more personalized and specific than before
- [ ] No hallucinated facts that aren't in description or structured data

### Test 3: Dogs Without Descriptions

**Objective**: Verify graceful handling when descriptions are missing

**Steps**:
1. Find a dog listing that doesn't have a PetFinder description
2. Verify it still appears in results
3. Check AI-generated recommendation

**Expected Results**:
- [ ] Dog appears in results normally
- [ ] AI recommendation is generated (using fallback logic)
- [ ] No errors in console
- [ ] Recommendation focuses on breed characteristics when description unavailable

### Test 4: Description Sanitization Edge Cases

**Test Cases**:
1. **HTML in description**: Description with `<p>`, `<br>`, etc.
   - [ ] HTML is stripped, plain text remains
2. **Very long description**: >1,500 characters
   - [ ] Truncated to 1,500 chars with ellipsis
3. **Description with PII**: Contains email or phone
   - [ ] PII is removed
4. **Empty/null description**: Missing description field
   - [ ] Handled gracefully, no errors
5. **Special characters**: Unicode, emojis, etc.
   - [ ] Preserved correctly (not corrupted)

**Manual Test**:
```bash
# Test sanitization directly (if you have access to test endpoint)
curl -X POST https://staging.dogyenta.com/api/test-description \
  -H "Content-Type: application/json" \
  -d '{"description": "<p>Test with <b>HTML</b> and email@example.com</p>"}'
```

### Test 5: Observability Logging

**Objective**: Verify description usage is logged correctly

**Steps**:
1. Perform multiple searches
2. Check Vercel function logs
3. Look for description usage patterns

**Expected Results**:
- [ ] Logs show `[reasoning] Using shelter description` for dogs with descriptions
- [ ] Logs include description hash for deduplication
- [ ] Logs include snippet (first 50 chars)
- [ ] No sensitive data (full descriptions) in logs

**Verification**:
- Check Vercel dashboard → Functions → Logs
- Filter for `[reasoning]` or `description`

---

## V2 Testing: Inferred Trait Bonuses (Feature-Flagged)

**Prerequisites**: V1 must be verified and stable before testing V2

### Test 6: Feature Flag Control

**Objective**: Verify V2 can be toggled on/off

**Steps**:
1. Set `NEXT_PUBLIC_FEATURE_MATCH_USE_INFERRED_TRAITS=false` in Vercel
2. Redeploy
3. Perform a search
4. Check matching results
5. Toggle flag to `true`
6. Redeploy
7. Perform same search
8. Compare results

**Expected Results**:
- [ ] With flag OFF: No inferred trait bonuses applied
- [ ] With flag ON: Bonuses applied when traits match
- [ ] Rankings change only when flag is ON
- [ ] No errors when flag is toggled

**Verification**:
```javascript
// Check feature flag state
const flags = await fetch('/api/feature-flags').then(r => r.json());
console.log('Match inferred traits:', flags.match_use_inferred_traits);
```

### Test 7: Trait Inference on Ingestion

**Objective**: Verify traits are inferred when dogs are fetched

**Steps**:
1. Enable V2 feature flag
2. Perform a search for dogs with descriptions
3. Wait 5-10 seconds (background inference)
4. Check database for `traits_inferred` data

**Expected Results**:
- [ ] Background inference runs without blocking API response
- [ ] `traits_inferred` column populated in `dog_cache` table
- [ ] Inference only runs for dogs with descriptions
- [ ] Inference skips dogs that already have cached traits

**Database Verification**:
```sql
-- Check if traits are being stored
SELECT petfinder_id, traits_inferred, updated_at
FROM dog_cache
WHERE traits_inferred IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

**Log Verification**:
- Check Vercel logs for: `🔍 Batch inferring traits for X dogs...`
- Check for: `✅ Stored inferred traits for X dogs`

### Test 8: Scoring Bonus Application

**Objective**: Verify bonuses are applied correctly when traits match user preferences

**Test Scenario 1: Energy Match**
- User preference: `energy: "high"`
- Dog description: "This energetic dog loves to run and play"
- Inferred trait: `energy: "high"`, `confidence: 0.85`

**Expected**:
- [ ] Bonus applied (confidence 0.85 >= 0.75 threshold)
- [ ] Bonus amount: `min(2.0, 0.85 * 2.0) = 1.7`
- [ ] Score increased by bonus
- [ ] `inferredBonusTotal` field present in `DogAnalysis`

**Test Scenario 2: Kid-Friendly Match**
- User preference: `flags.kidFriendly: true`
- Dog description: "Great with kids, loves children"
- Inferred trait: `kidFriendly: "yes"`, `confidence: 0.90`

**Expected**:
- [ ] Bonus applied
- [ ] Bonus amount: `min(2.0, 0.90 * 2.0) = 1.8`
- [ ] Score reflects bonus

**Test Scenario 3: Multiple Matches**
- User preferences: `energy: "high"`, `flags.apartmentOk: true`
- Dog matches both with high confidence

**Expected**:
- [ ] Both bonuses calculated
- [ ] Total bonus capped at 5.0 (MAX_TOTAL_INFERRED_BONUS)
- [ ] `scoreComponents` shows breakdown

**Manual Verification**:
```javascript
// After matching, check analysis
const results = await fetch('/api/match-dogs', {
  method: 'POST',
  body: JSON.stringify({ userPreferences, dogs })
}).then(r => r.json());

results.results.topMatches.forEach(match => {
  console.log('Dog:', match.dogId);
  console.log('Score:', match.score);
  console.log('Inferred bonus:', match.inferredBonusTotal);
  console.log('Components:', match.scoreComponents);
});
```

### Test 9: Bonus Caps and Thresholds

**Objective**: Verify bonuses respect configuration limits

**Test Cases**:
1. **Confidence below threshold** (0.70 < 0.75):
   - [ ] No bonus applied
2. **Per-trait cap** (confidence 1.0 → bonus should be 2.0, not 2.0 * 1.0):
   - [ ] Bonus capped at `MAX_BONUS_PER_TRAIT`
3. **Total bonus cap** (multiple matches summing to >5.0):
   - [ ] Total bonus capped at `MAX_TOTAL_INFERRED_BONUS`
4. **No penalties** (trait mismatch):
   - [ ] Only positive bonuses, never negative scores

**Verification**:
- Check console logs: `📈 Inferred trait bonuses: { dogsWithBonuses, totalBonus, avgBonus, maxBonus }`
- Verify maxBonus <= 5.0
- Verify no negative bonuses

### Test 10: Ranking Impact

**Objective**: Verify bonuses cause modest ranking changes, not wholesale reshuffling

**Steps**:
1. Perform search with V2 flag OFF
2. Record top 10 dog IDs and scores
3. Enable V2 flag
4. Perform same search
5. Compare rankings

**Expected Results**:
- [ ] Top 3 may shift slightly within similar score clusters
- [ ] No dramatic reordering (deterministic scoring still primary)
- [ ] Dogs with bonuses may move up 1-3 positions
- [ ] Overall ranking structure remains similar

**Verification**:
```javascript
// Compare rankings
const resultsOff = await fetch('/api/match-dogs', {...}).then(r => r.json());
// Toggle flag, wait for redeploy
const resultsOn = await fetch('/api/match-dogs', {...}).then(r => r.json());

// Compare top 10
const top10Off = resultsOff.results.allMatches.slice(0, 10).map(m => m.dogId);
const top10On = resultsOn.results.allMatches.slice(0, 10).map(m => m.dogId);

// Should have significant overlap
const overlap = top10Off.filter(id => top10On.includes(id)).length;
console.log('Top 10 overlap:', overlap, '/ 10'); // Should be >= 7
```

### Test 11: Analytics & Monitoring

**Objective**: Verify bonus analytics are tracked correctly

**Steps**:
1. Perform multiple searches with V2 enabled
2. Check console logs for analytics
3. Review Vercel function logs

**Expected Results**:
- [ ] Logs show: `📈 Inferred trait bonuses: { dogsWithBonuses, totalBonus, avgBonus, maxBonus }`
- [ ] `dogsWithBonuses` count is reasonable (not 0%, not 100%)
- [ ] `maxBonus` <= 5.0 (respects cap)
- [ ] `avgBonus` is reasonable (typically 1-3)

**Verification**:
- Check Vercel logs for analytics output
- Verify distribution is logged

### Test 12: Flag Toggle Parity

**Objective**: Verify rankings return to baseline when flag is OFF

**Steps**:
1. With flag ON, perform search, record results
2. Toggle flag OFF, redeploy
3. Perform same search
4. Compare results

**Expected Results**:
- [ ] Rankings match baseline (flag OFF) exactly
- [ ] Scores match baseline (no bonuses)
- [ ] No `inferredBonusTotal` or `scoreComponents` in results
- [ ] Deterministic scoring unchanged

**Critical**: This ensures V2 is fully reversible.

---

## Integration Tests

### Test 13: End-to-End Flow

**Full User Journey**:
1. [ ] User searches for dogs
2. [ ] Dogs with descriptions are fetched
3. [ ] Descriptions are sanitized and stored
4. [ ] AI generates recommendations using descriptions (V1)
5. [ ] If V2 enabled: Traits inferred, bonuses applied
6. [ ] Results displayed with enhanced recommendations

**Expected**:
- [ ] No errors in console
- [ ] Page loads successfully
- [ ] Recommendations appear
- [ ] Recommendations reference description facts (V1)
- [ ] Rankings reflect bonuses if V2 enabled

### Test 14: Performance Impact

**Objective**: Verify feature doesn't significantly impact performance

**Metrics to Check**:
- [ ] API response time for `/api/dogs` (should not increase significantly)
- [ ] Matching time (V1: no change, V2: slight increase for trait loading)
- [ ] AI generation time (V1: may increase slightly due to longer prompts)

**Baseline** (before deployment):
- Record: `/api/dogs` response time
- Record: Matching completion time
- Record: AI generation time

**After Deployment**:
- [ ] `/api/dogs` response time: < 2s increase (background inference doesn't block)
- [ ] Matching time: < 500ms increase (trait loading)
- [ ] AI generation time: < 1s increase (longer prompts)

**Verification**:
```bash
# Time API calls
time curl -s https://staging.dogyenta.com/api/dogs?zip=10001&radius=50 > /dev/null
```

### Test 15: Error Handling

**Test Cases**:
1. **OpenAI API failure**:
   - [ ] Graceful fallback to non-AI recommendations
   - [ ] No crashes or errors shown to user
2. **Database connection failure** (V2):
   - [ ] Matching continues without inferred traits
   - [ ] No bonuses applied, but no errors
3. **Invalid description data**:
   - [ ] Handled gracefully
   - [ ] Sanitization prevents issues

---

## Regression Tests

### Test 16: Existing Functionality

**Verify no breaking changes**:
- [ ] User can search for dogs
- [ ] Matching algorithm works (deterministic scoring)
- [ ] Results are displayed correctly
- [ ] User preferences are saved/loaded
- [ ] Email alerts still work
- [ ] Authentication works
- [ ] Payment flows work

### Test 17: Edge Cases

1. **No dogs returned**:
   - [ ] No errors, empty state displayed
2. **All dogs have descriptions**:
   - [ ] All recommendations use descriptions
3. **No dogs have descriptions**:
   - [ ] System works normally, no errors
4. **Very large result set** (100+ dogs):
   - [ ] Performance acceptable
   - [ ] Background inference doesn't overwhelm system

---

## V1 Success Criteria

**Must Pass Before V1 Deployment**:
- [ ] All V1 tests (1-5) pass
- [ ] Descriptions are extracted and sanitized correctly
- [ ] AI recommendations reference description facts
- [ ] No increase in hallucination/incorrect claims
- [ ] No performance degradation
- [ ] No breaking changes to existing functionality

**Qualitative Assessment**:
- [ ] Recommendations feel more personalized
- [ ] Recommendations include specific, concrete facts
- [ ] User experience is improved

---

## V2 Success Criteria (After V1 is Stable)

**Must Pass Before Enabling V2**:
- [ ] All V2 tests (6-12) pass
- [ ] Feature flag works correctly
- [ ] Bonuses are applied correctly
- [ ] Bonuses respect caps and thresholds
- [ ] Rankings change modestly (not dramatically)
- [ ] Flag toggle returns to baseline
- [ ] Analytics are tracked
- [ ] Performance impact is acceptable

**Metrics**:
- [ ] 95% of dogs receive ≤ total cap (5.0) in bonuses
- [ ] Average bonus: 1-3 points
- [ ] Top 10 ranking overlap: ≥ 70% when flag toggled

---

## Rollback Plan

### If V1 Issues Found:
1. Revert code deployment in Vercel
2. No database rollback needed (descriptions are additive)
3. Verify previous functionality restored

### If V2 Issues Found:
1. Set `NEXT_PUBLIC_FEATURE_MATCH_USE_INFERRED_TRAITS=false`
2. Redeploy (no code changes needed)
3. Verify rankings return to baseline

### Database Rollback (if needed):
```sql
-- Only if absolutely necessary
ALTER TABLE dog_cache DROP COLUMN IF EXISTS traits_inferred;
DROP INDEX IF EXISTS idx_dog_cache_petfinder_id;
```

---

## Monitoring Post-Deployment

### First 24 Hours:
- [ ] Monitor error rates in Vercel logs
- [ ] Check OpenAI API usage/costs
- [ ] Monitor database query performance
- [ ] Watch for any user-reported issues

### Key Metrics to Track:
- Description extraction rate (% of dogs with descriptions)
- AI generation success rate
- Average recommendation quality (qualitative)
- V2 bonus distribution (if enabled)
- Performance metrics (response times)

---

## Test Execution Log

**Date**: _______________
**Tester**: _______________
**Environment**: Staging
**Deployment Version**: _______________

### V1 Tests
- [ ] Test 1: Description Extraction
- [ ] Test 2: AI Recommendations
- [ ] Test 3: Missing Descriptions
- [ ] Test 4: Sanitization Edge Cases
- [ ] Test 5: Observability

### V2 Tests (After V1 Verified)
- [ ] Test 6: Feature Flag
- [ ] Test 7: Trait Inference
- [ ] Test 8: Scoring Bonuses
- [ ] Test 9: Bonus Caps
- [ ] Test 10: Ranking Impact
- [ ] Test 11: Analytics
- [ ] Test 12: Flag Toggle Parity

### Integration Tests
- [ ] Test 13: End-to-End
- [ ] Test 14: Performance
- [ ] Test 15: Error Handling

### Regression Tests
- [ ] Test 16: Existing Functionality
- [ ] Test 17: Edge Cases

**Overall Status**: ☐ Pass | ☐ Fail | ☐ Needs Review

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

