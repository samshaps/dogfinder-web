# Story 2.2: Contradiction Detection for Conflicting Preferences

Status: in-progress

## Story

As a user searching for a dog,
I want to be gently warned when my preferences conflict,
so that I understand why results may be unexpected and can adjust before the search runs.

## Acceptance Criteria

1. After `app/api/normalize-guidance/route.ts` returns normalized preferences, a contradiction check runs against the structured output.
2. The following contradictions are detected:
   - `energy: 'high'` + any `notes` containing "low maintenance", "easy", "low-key", "chill" (or the parsed equivalent)
   - `energy: 'low'` + `temperament` containing "playful", "energetic", "active"
   - `size: ['small']` + `temperament` containing "guard", "protection", "working"
   - Any explicit `energy` value that contradicts a lifestyle flag inferred from guidance (e.g., "apartment ok" + `energy: 'high'`)
3. When a contradiction is detected, the API response includes a `warnings` array with human-readable advisory strings, e.g.: `"Heads up — high-energy dogs tend to need more exercise and daily activity. We've included them but flagged it."`
4. Warnings are non-blocking: the search still proceeds and returns results.
5. The UI displays warnings prominently before the result list (e.g., a yellow advisory banner) when `warnings` is non-empty.
6. When no contradictions are detected, `warnings` is an empty array or omitted.

## Tasks / Subtasks

- [x] Create contradiction detection utility (AC: 1, 2, 3, 6)
  - [x] Create `lib/utils/detect-contradictions.ts`
  - [x] `detectExplicitContradictions(energy, temperament)` — Type 1, no API needed
  - [x] `detectGuidanceContradictions(energy, size, normPrefs)` — Type 2, uses NormPrefs
  - [x] `detectNormPrefsContradictions(normPrefs)` — used by normalize-guidance route internally
  - [x] Implement the contradiction rules from AC: 2
- [x] Integrate into normalize-guidance route (AC: 1)
  - [x] After parsing `NormPrefs`, call `detectNormPrefsContradictions(parsed)`
  - [x] Add `warnings: string[]` to the response JSON
- [x] Update `NormPrefs` type (AC: 3)
  - [x] Add `warnings?: string[]` to the `NormPrefs` type in `app/api/normalize-guidance/route.ts`
- [x] Build UI warning on form page (AC: 4, 5) — design pivot from original story
  - [x] Warning surfaces on `app/find/page.tsx` before redirect (not on results page)
  - [x] Type 1: instant client-side check on explicit fields (energy vs temperament)
  - [x] Type 2: calls `/api/normalize-guidance` when guidance text is present, runs cross-check
  - [x] Shows yellow advisory banner with each warning as a separate bullet
  - [x] "Search anyway" proceeds; "Edit preferences" clears and stays on form
  - [x] Submit button shows "Checking preferences..." spinner during Type 2 API call

## Dev Notes

- The `NormPrefs` type is defined in `app/api/normalize-guidance/route.ts` — the `notes` array contains the AI's own description of its mappings, which is useful for detecting semantic contradictions even when explicit fields don't conflict.
- The contradiction check should use the structured fields primarily (`energy`, `size`, `temperament`) rather than re-parsing the raw guidance text — the normalized output is the source of truth.
- Advisory message tone: gentle, informative, not judgmental. Frame as "here's what we did with your preferences" not "your preferences are wrong." Follow the QA report's example: *"Heads up — high-energy dogs tend to need more exercise. We've included them but flagged it."*
- The matching flow: `normalize-guidance` (already called before `match-dogs`) → contradiction check → results. The `warnings` can be added to the normalize-guidance response and forwarded by the client, or computed inside `match-dogs` after calling normalize-guidance internally — confirm where normalize-guidance is invoked relative to match-dogs.
- Check `lib/matching-flow.ts` and `app/api/match-dogs/route.ts` to understand whether normalize-guidance is called client-side or server-side in the matching pipeline.

### Project Structure Notes

- New file: `lib/utils/detect-contradictions.ts`
- Modified files: `app/api/normalize-guidance/route.ts`, `lib/schemas.ts`, `lib/matching-flow.ts`
- UI: find the results page/component in `app/` directory

### References

- [Source: DogYenta_QA_Report.docx — Product Improvements, Vibe Coding Audience: Contradiction Detection]
- [Source: app/api/normalize-guidance/route.ts — NormPrefs type and AI parsing logic]
- [Source: lib/matching-flow.ts — matching pipeline orchestration]
- [Source: lib/schemas.ts — MatchingResults type]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Design pivot from original story: warnings surface on `app/find/page.tsx` (form page) instead of results page, per Sam's direction. Non-blocking — "Search anyway" proceeds, "Edit preferences" stays on form.
- Did not modify `lib/matching-flow.ts`, `lib/schemas.ts` (MatchingResults), or `app/api/match-dogs/route.ts` — not needed with form-page approach.
- `detectNormPrefsContradictions` integrates with normalize-guidance route for API completeness; the form page uses `detectGuidanceContradictions` directly with explicit form fields for accurate cross-checking.

### File List

- `frontend/lib/utils/detect-contradictions.ts` (new)
- `frontend/app/api/normalize-guidance/route.ts` (modified)
- `frontend/app/find/page.tsx` (modified)
