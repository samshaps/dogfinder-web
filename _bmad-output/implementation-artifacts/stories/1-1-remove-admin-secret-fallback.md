# Story 1.1: Remove ADMIN_SECRET Fallback

Status: done

## Story

As a security-conscious operator,
I want admin endpoints to fail hard when ADMIN_SECRET is unset,
so that no deployment can ever be accessed with a known-plaintext fallback password.

## Acceptance Criteria

1. `app/api/admin/sync-plans/route.ts` — the `|| 'admin-secret'` fallback is removed; if `ADMIN_SECRET` is not set, the handler returns HTTP 500 with a message like `"Server misconfiguration: required environment variable is not set"` and does not proceed.
2. `app/api/trigger-cron/route.ts` — same fix applied.
3. No other admin or internal route uses a hardcoded fallback secret.
4. A startup-time environment variable check (or inline guard) makes the failure mode explicit in logs.
5. Existing behavior for requests with a valid `ADMIN_SECRET` is unchanged.

## Tasks / Subtasks

- [x] Fix admin/sync-plans route (AC: 1)
  - [x] Remove `|| 'admin-secret'` from `adminSecret` assignment
  - [x] Add guard: if `!process.env.ADMIN_SECRET`, log error and return 500
- [x] Fix trigger-cron route (AC: 2)
  - [x] Same pattern as above
- [x] Audit remaining routes for similar fallback patterns (AC: 3)
  - [x] Audited all `app/api/` routes; also fixed `app/api/test-email/route.ts` which had same pattern
- [x] Add env var validation utility or inline check (AC: 4)

## Dev Notes

- **Severity:** CRITICAL — any attacker who reads the public repo can call these endpoints with `Authorization: Bearer admin-secret` today.
- The pattern to find: `const adminSecret = process.env.ADMIN_SECRET || 'admin-secret';`
- The fix: `const adminSecret = process.env.ADMIN_SECRET; if (!adminSecret) { console.error('ADMIN_SECRET env var not set'); return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 }); }`
- Consider a shared `requireEnvVar(name: string): string` utility in `lib/config.ts` that throws if missing — keeps this pattern consistent across routes.

### Project Structure Notes

- Files to touch: `app/api/admin/sync-plans/route.ts`, `app/api/trigger-cron/route.ts`, optionally `lib/config.ts`
- No schema or DB changes required

### References

- [Source: DogYenta_QA_Report.docx — CRITICAL: Hardcoded Fallback Admin Password]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — straightforward string replacement.

### Completion Notes List

- Removed `|| 'admin-secret'` hardcoded fallback from `app/api/admin/sync-plans/route.ts`; added early-return 500 guard when `ADMIN_SECRET` is unset.
- Same fix applied to `app/api/trigger-cron/route.ts`; also removed `|| 'admin-secret'` tail from the `ADMIN_SECRET || cronSecret || 'admin-secret'` chain, adding a 500 guard when no secret at all is configured (dev mode bypasses as before).
- Audit found a third affected route: `app/api/test-email/route.ts` — same pattern fixed identically to trigger-cron.
- `app/api/debug-email-status/route.ts` was already clean (no hardcoded fallback).
- `frontend/scripts/test-module3.js` still has `|| 'admin-secret'`; it is a local dev script, not an API route — not in scope per AC 3.
- No utility function added (`requireEnvVar`) as the inline pattern is already consistent across 3 routes and matches the story's prescribed fix verbatim.

### File List

- `frontend/app/api/admin/sync-plans/route.ts`
- `frontend/app/api/trigger-cron/route.ts`
- `frontend/app/api/test-email/route.ts`
