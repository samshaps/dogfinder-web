# Story 2.2: Contradiction Detection for Conflicting Preferences

Status: ready-for-dev

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

- [ ] Create contradiction detection utility (AC: 1, 2, 3, 6)
  - [ ] Create `lib/utils/detect-contradictions.ts`
  - [ ] Input: `NormPrefs` (from `app/api/normalize-guidance/route.ts`)
  - [ ] Output: `string[]` — array of advisory messages, empty if no contradictions
  - [ ] Implement the contradiction rules from AC: 2
- [ ] Integrate into normalize-guidance route (AC: 1, 4)
  - [ ] After parsing `NormPrefs`, call `detectContradictions(prefs)`
  - [ ] Add `warnings: string[]` to the response JSON
- [ ] Update `NormPrefs` type (AC: 3)
  - [ ] Add `warnings?: string[]` to the `NormPrefs` type in `app/api/normalize-guidance/route.ts`
- [ ] Update matching flow to thread warnings through (AC: 4)
  - [ ] In `lib/matching-flow.ts`, ensure `warnings` from normalize-guidance is included in `MatchingResults`
  - [ ] Add `warnings?: string[]` to `MatchingResults` in `lib/schemas.ts`
- [ ] Build UI warning banner (AC: 5)
  - [ ] Find the results page component — likely in `app/` (e.g., `app/page.tsx` or `app/results/page.tsx`)
  - [ ] When `warnings` is non-empty, render a non-dismissable yellow advisory above the result list
  - [ ] Each warning should render as a separate item

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

_to be filled_

### Debug Log References

### Completion Notes List

### File List
