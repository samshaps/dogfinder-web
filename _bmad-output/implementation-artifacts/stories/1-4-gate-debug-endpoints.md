# Story 1.4: Gate Debug/Test Endpoints + Fix Table Enumeration

Status: in-progress

## Story

As a platform operator,
I want debug and test API routes to be inaccessible in production,
so that they don't expand the attack surface and cannot be used to probe internal system tables.

## Acceptance Criteria

1. The following routes return HTTP 404 when `NODE_ENV === 'production'`:
   - `app/api/debug-schema/route.ts`
   - `app/api/debug-email-status/route.ts`
   - `app/api/debug/resend-test/route.ts`
   - `app/api/test/route.ts`
   - `app/api/test-ai/route.ts`
   - `app/api/test-email/route.ts`
   - `app/api/test-supabase/route.ts`
2. The gate is implemented at the top of each route handler (or via shared middleware), not by removing the files — this preserves local dev utility.
3. `app/api/debug-schema/route.ts` additionally validates the `table` query parameter against an explicit allowlist of safe, application-owned table names before passing it to Supabase.
4. Requests to `debug-schema` with a table name not in the allowlist return HTTP 400.
5. Behavior in `development` and `test` environments is unchanged.

## Tasks / Subtasks

- [x] Add production guard to all debug/test routes (AC: 1, 2, 5)
  - [x] Add to top of each handler: `if (process.env.NODE_ENV === 'production') { return NextResponse.json({ error: 'Not found' }, { status: 404 }); }`
  - [x] Routes to update: debug-schema, debug-email-status, debug/resend-test, test, test-ai, test-email, test-supabase
  - [x] Extracted `requireNonProduction()` helper to `lib/api/helpers.ts`
- [x] Add table allowlist to debug-schema (AC: 3, 4)
  - [x] Define `const ALLOWED_TABLES = ['users', 'plans', 'preferences', 'alert_settings', 'email_events', 'dog_cache']`
  - [x] Validate `table` query param against allowlist before Supabase call
  - [x] Return 400 with `{ error: 'Table not in allowlist' }` if invalid

## Dev Notes

- The two issues (debug routes in prod + table enumeration) are combined here because they both live in or around `debug-schema` and share the same root cause: debug tooling deployed to production without guards.
- For the allowlist in `debug-schema`, look at the Supabase schema files in `dogfinder-app/CHECK_SCHEMA.sql` to get the actual table names.
- The `NODE_ENV` check is the simplest approach; an alternative is a `ENABLE_DEBUG_ROUTES=true` env var that must be explicitly set, which is slightly safer because it's opt-in rather than opt-out.

### Project Structure Notes

- Files to touch: `app/api/debug-schema/route.ts`, `app/api/debug-email-status/route.ts`, `app/api/debug/resend-test/route.ts`, `app/api/test/route.ts`, `app/api/test-ai/route.ts`, `app/api/test-email/route.ts`, `app/api/test-supabase/route.ts`
- Optional shared helper: `lib/api/helpers.ts`

### References

- [Source: DogYenta_QA_Report.docx — MEDIUM: Debug/Test Endpoints Deployed to Production]
- [Source: DogYenta_QA_Report.docx — MEDIUM: Arbitrary Table Enumeration via debug-schema]
- [Source: dogfinder-app/CHECK_SCHEMA.sql — for table allowlist]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Added `requireNonProduction()` helper to `lib/api/helpers.ts` — returns 404 in production, null otherwise
- `debug/resend-test` previously used `VERCEL_ENV === 'production'` → 403; normalized to `NODE_ENV === 'production'` → 404
- Table allowlist in `debug-schema`: users, plans, preferences, alert_settings, email_events, dog_cache

### File List

- frontend/lib/api/helpers.ts
- frontend/app/api/debug-schema/route.ts
- frontend/app/api/debug-email-status/route.ts
- frontend/app/api/debug/resend-test/route.ts
- frontend/app/api/test/route.ts
- frontend/app/api/test-ai/route.ts
- frontend/app/api/test-email/route.ts
- frontend/app/api/test-supabase/route.ts
