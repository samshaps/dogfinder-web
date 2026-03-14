# Story 3.3: Audit and Validate Breed Include/Exclude Filter Logic

Status: in-progress

## Story

As a **Dog Yenta user who has set breed preferences**,
I want the include/exclude breed filter to behave correctly across all matching scenarios,
so that I only see dogs matching my stated preferences and dogs I've excluded never appear in my results.

## Acceptance Criteria

1. **Given** Include `["lab"]` → dog breed `"Labrador Retriever"` → **passes** (alias match).
2. **Given** Exclude `["poodle"]` → dog breed `"Goldendoodle"` → **blocked** (family match, tier 3).
3. **Given** Include `["golden retriever"]`, Exclude `["poodle"]` → dog breed `"Golden Retriever, Poodle"` → **blocked** (exclude takes precedence).
4. **Given** Empty include list, empty exclude list → any dog breed → **passes**.
5. **Given** Include `["husky"]` → dog breed `"Siberian Husky"` → **passes** (fuzzy/alias match).
6. **Given** each scenario above, **then** the test scenarios are committed as a `describe` block or comment block in `__tests__/` alongside the filter code for future regression coverage.
7. **Given** any failing scenario, **then** it is fixed in `filterByBreeds()` or `dogBreedHit()` or the expansion functions before the story is marked done.

## Tasks / Subtasks

- [x] Trace scenario 1: `["lab"]` include → `"Labrador Retriever"` (AC: #1)
  - [x] Run `expandUserBreedsV2(["lab"])` mentally/in test: `normalizeQueryV2("lab")` replaces `\blab\b` → "labrador", then SYNONYMS_V2["labrador"] is undefined, best DICTIONARY candidate for "labrador" scores low → expanded = `["labrador"]`
  - [x] `dogBreedHit({breeds:["Labrador Retriever"]}, ["labrador"])`: tier 1 exact fails, tier 2 alias fails (SYNONYMS_V2["labrador retriever"] undefined), tier 3 family fails ("labrador" not in BREED_FAMILIES_V2), tier 4/5 edit+cosine likely fail → **BUG CONFIRMED, FIXED**
  - [x] Fix: Added `"labrador": "labrador retriever"` to `SYNONYMS_V2` — now `normalizeQueryV2("lab")` → "labrador" → SYNONYMS_V2["labrador"] → "labrador retriever" → tier 1 exact match
- [x] Trace scenario 2: `["poodle"]` exclude → `"Goldendoodle"` (AC: #2)
  - [x] `expandUserBreedsV2(["poodle"])` → expanded = `["poodle"]`
  - [x] `dogBreedHit({breeds:["Goldendoodle"]}, ["poodle"])`: tier 3 `BREED_FAMILIES_V2["poodle"]` includes "goldendoodle" → **hit=true** ✅ Already worked
  - [x] Confirmed with test
- [x] Trace scenario 3: Include `["golden retriever"]`, Exclude `["poodle"]` → dog breeds `["Golden Retriever", "Poodle"]` (AC: #3)
  - [x] `filterByBreeds()` checks exclude first: `dogBreedHit({breeds:["Golden Retriever","Poodle"]}, expandedExclude)` where expandedExclude contains "poodle" → tier 1 exact on "poodle" = true → **blocked** ✅ Already worked
  - [x] Confirmed with test
- [x] Trace scenario 4: empty include + empty exclude (AC: #4)
  - [x] `dogBreedHit(dog, [])`: first line checks `if (!expanded?.length) return { hit: true, tier: 99 }` → **passes** ✅ Already worked
  - [x] `filterByBreeds()`: `expandedExclude.length === 0` skips exclude check; `expandedInclude.length === 0` returns true → **passes** ✅ Already worked
- [x] Trace scenario 5: `["husky"]` include → `"Siberian Husky"` (AC: #5)
  - [x] `expandUserBreedsV2(["husky"])` → "husky" is in DICTIONARY, scores 1.0 against itself → expanded = `["husky"]`
  - [x] `dogBreedHit({breeds:["Siberian Husky"]}, ["husky"])`: tier 1 "siberian husky" ≠ "husky"; tier 2 SYNONYMS_V2["siberian husky"] undefined; tier 3 "husky" not in BREED_FAMILIES_V2 → **BUG CONFIRMED, FIXED**
  - [x] Fix: Added `"husky": ["siberian husky", "husky", "alaskan malamute"]` to `BREED_FAMILIES_V2` — tier 3 now catches "siberian husky" when expanded contains "husky"
- [x] Write test scenarios as a `describe` block (AC: #6)
  - [x] Created `frontend/__tests__/breed-filter.test.ts` (did not exist)
  - [x] Covers all 5 scenarios with `it()` assertions using `passesBreedFilter()` and direct `dogBreedHit()` unit tests
- [x] Verify no regressions to existing breed filter tests

## Dev Notes

- **Full filter stack** (trace from user pref to filter result):
  1. User prefs stored as `include_breeds: string[]` and `exclude_breeds: string[]` in Supabase
  2. `normalizeUserPreferences()` in `lib/normalization.ts` calls `expandUserBreedsV2()` → produces `effectivePrefs.breeds.expandedInclude` and `expandedExclude`
  3. `filterByBreeds(dogs, effectivePrefs)` in `lib/filtering.ts` calls `dogBreedHit(dog, expandedExclude)` first (exclude wins), then `dogBreedHit(dog, expandedInclude)`
  4. `dogBreedHit()` in `utils/breedFuzzy.ts` runs 5 tiers: exact → alias → family → phonetic/edit → ngram

- **The two likely bugs:**
  - **Bug A — "lab" → Labrador Retriever**: `normalizeQueryV2("lab")` maps "lab" → "labrador" before the `SYNONYMS_V2` lookup, so `SYNONYMS_V2["lab"]` is never reached. The expanded term "labrador" then fails to match "labrador retriever" in dogBreedHit at all tiers.
  - **Bug B — "husky" → Siberian Husky**: "husky" expands correctly to "husky", but `dogBreedHit` can't match "siberian husky" against "husky" at any tier (no alias, no family, cosine too low).

- **Recommended fixes:**
  - Add to `SYNONYMS_V2`: `"labrador": "labrador retriever"` (catches Bug A after normalizeQueryV2 transforms "lab")
  - Add to `SYNONYMS_V2` on the dogBreedHit side — but SYNONYMS_V2 is used for field normalization, so also add to `BREED_FAMILIES_V2`: `"husky": ["siberian husky", "husky", "alaskan malamute"]` (Bug B — so tier 3 family catches "siberian husky" when user said "husky")
  - Alternatively for Bug B: add `"husky": "siberian husky"` as a reverse alias that `dogBreedHit` checks in tier 2

- **V1 functions still present** (`expandUserBreeds`, `breedHit`, `expandUserBreedsLegacy`, `breedHitLegacy`) — **do not remove them in this story**. Story 3.4 (dead code audit) should handle that. Only fix V2 path (`expandUserBreedsV2`, `dogBreedHit`).

- **`filterByBreeds()` logic is correct** — exclude-first ordering is already right. Bugs are in the expansion/matching layer, not the filter orchestration.

### Project Structure Notes

- Filter logic: `frontend/lib/filtering.ts` (read context — changes likely not needed here)
- Fuzzy matching: `frontend/utils/breedFuzzy.ts` — **primary change target**
  - `SYNONYMS_V2` dict (~line 231)
  - `BREED_FAMILIES_V2` dict (~line 250)
- Normalization: `frontend/lib/normalization.ts` — uses `expandUserBreedsV2()`, read context
- Tests: `frontend/__tests__/breed-filter.test.ts` (may need to create) or add to existing test file

### References

- [Source: frontend/utils/breedFuzzy.ts#L231-L255] — `SYNONYMS_V2` and `BREED_FAMILIES_V2` dicts
- [Source: frontend/utils/breedFuzzy.ts#L257-L270] — `normalizeQueryV2()` — transforms "lab" → "labrador" before alias lookup
- [Source: frontend/utils/breedFuzzy.ts#L337-L374] — `expandUserBreedsV2()` — full expansion logic
- [Source: frontend/utils/breedFuzzy.ts#L377-L409] — `dogBreedHit()` — 5-tier matching
- [Source: frontend/lib/filtering.ts#L35-L57] — `filterByBreeds()` — exclude-first ordering
- [Source: frontend/lib/normalization.ts#L2-L20] — where `expandUserBreedsV2` is called

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- **Bug A (lab → Labrador Retriever)**: `normalizeQueryV2("lab")` transforms "lab" → "labrador" before the SYNONYMS_V2 lookup, so `SYNONYMS_V2["lab"]` was never reached. Fixed by adding `"labrador": "labrador retriever"` to SYNONYMS_V2 — the post-normalization key now resolves correctly.
- **Bug B (husky → Siberian Husky)**: "husky" expanded correctly to "husky" but `dogBreedHit` had no way to bridge "husky" → "siberian husky" at any tier (no alias in SYNONYMS_V2 for "siberian husky", no family entry for "husky", cosine ~0.46 < 0.72 threshold). Fixed by adding `"husky": ["siberian husky", "husky", "alaskan malamute"]` to BREED_FAMILIES_V2 — tier 3 family matching now catches this case.
- **Scenarios 2, 3, 4 already worked**: poodle→Goldendoodle (BREED_FAMILIES_V2["poodle"] already contained "goldendoodle"), exclude-first ordering (filterByBreeds already correct), and empty list early-return (dogBreedHit already returned tier 99 for empty expanded). No changes needed for these.
- Tests written using vitest (matching project's existing test framework) in `frontend/__tests__/breed-filter.test.ts`.

### File List

- `frontend/utils/breedFuzzy.ts` — added `"labrador": "labrador retriever"` to SYNONYMS_V2; added `"husky": ["siberian husky", "husky", "alaskan malamute"]` to BREED_FAMILIES_V2
- `frontend/__tests__/breed-filter.test.ts` — created; covers all 5 AC scenarios
