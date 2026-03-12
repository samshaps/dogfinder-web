# Story 1.2: Fix Cron Authentication

Status: ready-for-dev

## Story

As a platform operator,
I want the email alerts cron job to verify requests using a cryptographic secret,
so that arbitrary HTTP clients cannot trigger mass email sends by spoofing the Vercel User-Agent header.

## Acceptance Criteria

1. `app/api/cron/email-alerts/route.ts` no longer trusts requests based solely on `User-Agent` containing `vercel-cron` or the `X-Vercel-Cron` header.
2. Authentication is replaced with Vercel's `CRON_SECRET` mechanism: the route checks the `Authorization: Bearer <CRON_SECRET>` header that Vercel injects, verified using `crypto.timingSafeEqual` to prevent timing attacks.
3. Unauthenticated or incorrectly authenticated requests receive HTTP 401.
4. `CRON_SECRET` is documented in `frontend/ENV_TEMPLATE.txt` as a required environment variable.
5. Legitimate Vercel-triggered cron invocations continue to work correctly (i.e., the secret in the env matches what Vercel sends).

## Tasks / Subtasks

- [ ] Update cron auth check (AC: 1, 2)
  - [ ] Remove User-Agent / X-Vercel-Cron header trust
  - [ ] Read `process.env.CRON_SECRET`; if unset, return 500
  - [ ] Extract `Bearer` token from `Authorization` header
  - [ ] Compare with `crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret))`
  - [ ] Return 401 on mismatch
- [ ] Update ENV_TEMPLATE.txt (AC: 4)
- [ ] Verify existing `CRON_SECRET` guard (if present elsewhere) uses same pattern (AC: 3)

## Dev Notes

- Vercel docs: when a cron job fires, Vercel adds `Authorization: Bearer <CRON_SECRET>` automatically. The app just needs to verify it.
- Note: the QA report already observed that `CRON_SECRET` comparison elsewhere in the codebase correctly uses `crypto.timingSafeEqual` — replicate that exact pattern here.
- The `timingSafeEqual` import: `import { timingSafeEqual } from 'crypto';` — buffers must be equal length; if lengths differ, return 401 immediately without calling `timingSafeEqual` to avoid an exception.

### Project Structure Notes

- File to touch: `app/api/cron/email-alerts/route.ts`
- Supporting file: `frontend/ENV_TEMPLATE.txt`

### References

- [Source: DogYenta_QA_Report.docx — HIGH: Cron Authentication Bypass]
- [Source: Vercel Cron Job Security documentation]

## Dev Agent Record

### Agent Model Used

_to be filled_

### Debug Log References

### Completion Notes List

### File List
