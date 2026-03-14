# Story 3.1: Remove `matchScore` Dead Code from Email Pipeline

Status: in-progress

## Story

As a **developer maintaining the Dog Yenta codebase**,
I want the randomly-generated `matchScore` field removed from the email data pipeline,
so that the codebase doesn't silently generate meaningless data that misleads future developers.

## Acceptance Criteria

1. **Given** `lib/email/types.ts`, **when** the dead code is removed, **then** `matchScore: number` is deleted from the `EmailDogMatch` interface and `matchScore: z.number().min(0).max(100)` is deleted from `EmailTemplateDataSchema`.
2. **Given** `app/api/cron/email-alerts/route.ts` line 382, **when** the dead code is removed, **then** `matchScore: Math.floor(Math.random() * 30) + 70` is deleted from the `emailMatches` map.
3. **Given** `__tests__/email-alerts.test.ts`, **when** the dead code is removed, **then** `matchScore: 95` is removed from all three test fixture objects (lines 58, 277, 309) and tests continue to pass.
4. **Given** the email cron route, **when** the change is deployed, **then** email sending works correctly and email rendering is visually identical to before.
5. **Given** `minMatchScore` in `EmailAlertPreferencesSchema` (line 8 of `lib/email/types.ts`), **when** auditing this story, **then** determine if `minMatchScore` is referenced anywhere in filtering/sending logic — if it is dead code too, remove it in this same story.

## Tasks / Subtasks

- [x] Remove `matchScore` from `EmailDogMatch` interface (AC: #1)
  - [x] Delete line 50 in `frontend/lib/email/types.ts`: `matchScore: number;`
- [x] Remove `matchScore` from `EmailTemplateDataSchema` (AC: #1)
  - [x] Delete line 89 in `frontend/lib/email/types.ts`: `matchScore: z.number().min(0).max(100),`
- [x] Remove random generation from cron route (AC: #2)
  - [x] Delete line 382 in `frontend/app/api/cron/email-alerts/route.ts`: `matchScore: Math.floor(Math.random() * 30) + 70,`
- [x] Update test fixtures (AC: #3)
  - [x] Remove `matchScore: 95` from `buildSampleMatch()` return at `__tests__/email-alerts.test.ts:58`
  - [x] Remove `matchScore: 95` from second fixture at line 277
  - [x] Remove `matchScore: 95` from third fixture at line 309
- [x] Audit `minMatchScore` in `EmailAlertPreferencesSchema` (AC: #5)
  - [x] Search codebase for `minMatchScore` references
  - [x] `minMatchScore` IS used in filtering/sending logic (route.ts:317, hooks, UI component) — left in place
- [x] Verify build passes

## Dev Notes

- **`matchScore` is not rendered anywhere in email HTML** — confirmed by full code read of `lib/email/service.ts`. The field flows into the Zod schema validation and is required to pass, but never used in `generateDogCard()` or `generateEmailHTML()`. This means removing it from the schema removes the only validation gate that required a numeric value.
- **`EmailTemplateDataSchema` is used in `sendDogMatchAlert()`** (`lib/email/service.ts` line 28) via `safeParse()`. After removing `matchScore` from the schema, the `sendDogMatchAlert()` function will still work — callers just stop needing to pass the field.
- **Random generation location**: `frontend/app/api/cron/email-alerts/route.ts`, line 382 inside the `.map()` that builds `emailMatches`. Just delete the `matchScore` line from the object literal — no surrounding logic changes needed.
- **Test impact**: `buildSampleMatch()` in `__tests__/email-alerts.test.ts` returns a typed `EmailTemplateData['matches'][number]` object. After removing `matchScore` from the type, TypeScript will error if it's still present. Remove the field from all three places it appears (lines 58, 277, 309).
- **`minMatchScore`** in `EmailAlertPreferencesSchema` is a *separate* preference field (the user's minimum score threshold for filtering). Grep for `minMatchScore` in the codebase — if no filtering code reads it, it's also dead and should be removed in this story.

### Project Structure Notes

- Email types: `frontend/lib/email/types.ts`
- Email cron route: `frontend/app/api/cron/email-alerts/route.ts`
- Email service: `frontend/lib/email/service.ts` (read-only context — no changes needed here)
- Test file: `frontend/__tests__/email-alerts.test.ts`

### References

- [Source: frontend/lib/email/types.ts#L36-L62] — `EmailDogMatch` interface with `matchScore`
- [Source: frontend/lib/email/types.ts#L65-L105] — `EmailTemplateDataSchema` Zod schema with `matchScore`
- [Source: frontend/app/api/cron/email-alerts/route.ts#L354-L392] — emailMatches `.map()` with random `matchScore`
- [Source: frontend/__tests__/email-alerts.test.ts#L43-L69] — `buildSampleMatch()` fixture

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List

- `frontend/lib/email/types.ts` — removed `matchScore: number` from `EmailDogMatch` interface and `matchScore: z.number().min(0).max(100)` from `EmailTemplateDataSchema`
- `frontend/app/api/cron/email-alerts/route.ts` — removed `matchScore: Math.floor(Math.random() * 30) + 70` from emailMatches map
- `frontend/__tests__/email-alerts.test.ts` — removed `matchScore` from all 4 fixture instances (lines 58, 277, 309, 324)
- `frontend/lib/email/service.ts` — removed 3 additional `matchScore` instances found during audit (not in original story scope but required for build to pass)
