# Story 1.3: Strip Stack Traces from Error Responses

Status: ready-for-dev

## Story

As a security-conscious operator,
I want API error responses to omit internal stack traces,
so that attackers cannot use error output to map the application's internal file structure and code layout.

## Acceptance Criteria

1. `app/api/match-dogs/route.ts` line ~106: the `details: error instanceof Error ? error.stack : undefined` field is removed from the JSON response body.
2. The full stack trace is still logged server-side (e.g., via `console.error`).
3. The error response includes a sanitized message and optionally a request ID for log correlation, but no stack, no file paths, no internal module names.
4. A scan of other API routes confirms no other route leaks `error.stack` in responses.
5. Existing error handling behavior for clients (error status codes, error message fields) is otherwise unchanged.

## Tasks / Subtasks

- [x] Fix match-dogs error handler (AC: 1, 2, 3)
  - [x] Remove `details: error instanceof Error ? error.stack : undefined` from response
  - [x] Ensure `console.error` still logs the full error including stack
  - [x] Optionally add a `requestId` field using `crypto.randomUUID()` for correlation
- [x] Audit all other route catch blocks for stack leakage (AC: 4)
  - [x] `grep -r "error.stack" app/api/` — review and fix any matches
- [x] Check `lib/api/error-handler.ts` — if it's a shared handler, fix it there and all routes benefit (AC: 4)

## Dev Notes

- The exact line in `app/api/match-dogs/route.ts`:
  ```ts
  details: error instanceof Error ? error.stack : undefined
  ```
  Simply remove the `details` field. Nothing else needs to change.
- `lib/api/error-handler.ts` exists — check if it's a centralised error response builder. If so, fixing it there is the better approach and covers all routes that use it.
- Request ID pattern for correlation: `const requestId = crypto.randomUUID(); console.error('[requestId: ' + requestId + ']', error); return NextResponse.json({ error: message, requestId }, { status: 500 });`

### Project Structure Notes

- Primary file: `app/api/match-dogs/route.ts` (~line 104-106)
- Check also: `lib/api/error-handler.ts`, `lib/api/response.ts`

### References

- [Source: DogYenta_QA_Report.docx — HIGH: Stack Traces in Error Responses]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Found and fixed a second stack leak in `debug/resend-test/route.ts` at line 78 (`rawResponse.error.stack`) that was not explicitly listed in the story but discovered during the AC4 audit.
- `lib/api/error-handler.ts` confirmed safe — `error.stack` only used in `logError()` (server-side `console.error`), never in response bodies.
- `app/api/preferences/route.ts` confirmed safe — `error.stack` only in `console.error`, not in response body.

### File List

- `frontend/app/api/match-dogs/route.ts`
- `frontend/app/api/debug/resend-test/route.ts`
