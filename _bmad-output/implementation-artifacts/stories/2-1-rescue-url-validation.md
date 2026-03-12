# Story 2.1: Rescue URL Validation with Graceful Fallback

Status: ready-for-dev

## Story

As a user who has just matched with a dog,
I want the adoption link to always lead somewhere useful,
so that I can contact the shelter even if the listing URL is broken.

## Acceptance Criteria

1. Before a dog result is returned to the client, its `url` field is validated with a lightweight HTTP HEAD request.
2. If the HEAD request returns a 4xx status or times out (timeout: 3 seconds), the URL is considered invalid.
3. For invalid URLs: the `url` field in the response is set to `null`, and shelter contact info (`orgName`, `orgPhone`, `orgEmail`) is surfaced in its place if available.
4. If no contact info is available either, the response includes a `urlFallbackNote` field with a message like `"Listed by [Shelter Name] — search for them directly to inquire about adoption"`.
5. Valid URLs (2xx or 3xx redirects that resolve) are passed through unchanged.
6. URL validation does not block the entire results response — if validation for one dog fails or times out, the other dogs in the response are unaffected.
7. Validation only applies to RescueGroups URLs (the provider where outcome 3 — broken links — is a known issue). Petfinder URLs are passed through without HEAD validation.

## Tasks / Subtasks

- [ ] Add URL validation utility (AC: 1, 2, 5)
  - [ ] Create `lib/utils/validate-url.ts` with a `validateUrl(url: string): Promise<boolean>` function
  - [ ] Use `fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) })`
  - [ ] Return `true` for 2xx/3xx, `false` for 4xx/5xx/timeout
- [ ] Integrate validation into RescueGroups dog fetch (AC: 3, 4, 6, 7)
  - [ ] In `lib/dogProviders.ts`, after building the dog list from RescueGroups, run URL validation in parallel using `Promise.allSettled`
  - [ ] For dogs where validation returns false, null out `url` and add `urlFallbackNote`
  - [ ] Preserve org contact fields (`orgName`, `orgPhone`, `orgEmail`) in the dog object so the UI can display them
- [ ] Update dog result type/schema (AC: 3, 4)
  - [ ] Add optional `urlFallbackNote?: string` to the Dog type in `lib/schemas.ts`
  - [ ] Ensure `url` is already typed as `string | null`
- [ ] Update UI to display fallback (AC: 3, 4)
  - [ ] When `url` is null, show contact info or fallback note instead of the adoption link button
  - [ ] Find the dog result card component — likely in `components/` — and handle the null URL case

## Dev Notes

- The issue: RescueGroups API returns three URL outcome types: (1) direct listing page ✓, (2) redirect to rescue homepage ✓, (3) dead link ✗. Only outcome 3 needs to be caught.
- URL resolution logic is already in `lib/dogProviders.ts` around lines 174-217 — the validation should be added after this existing URL-building logic, not inside it.
- Run validation in parallel across all dogs in a batch using `Promise.allSettled` to avoid adding latency equal to `N × 3s`. Total added latency should be ~3s max (one timeout window) across the whole batch.
- The `AbortSignal.timeout(3000)` API is available in Node 18+ — the project is on Node 22, so this is fine.
- The Petfinder provider (`PetfinderProvider`) does not have the broken URL problem described in the QA report — only apply validation to `RescueGroupsProvider`.

### Project Structure Notes

- New file: `lib/utils/validate-url.ts`
- Modified files: `lib/dogProviders.ts`, `lib/schemas.ts`
- UI component: find dog result card in `components/` — likely `components/DogCard.tsx` or similar
- No API route changes required (this runs inside the provider layer, before data reaches `api/match-dogs`)

### References

- [Source: DogYenta_QA_Report.docx — Rescue URL validation — must-fix, checklist item 15]
- [Source: lib/dogProviders.ts lines 174-217 — existing URL resolution logic]

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

### File List
