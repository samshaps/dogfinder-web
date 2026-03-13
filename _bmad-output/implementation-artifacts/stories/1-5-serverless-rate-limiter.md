# Story 1.5: Replace In-Memory Rate Limiter

Status: done

## Story

As a platform operator,
I want rate limiting to work correctly across all serverless instances,
so that a caller cannot bypass limits by distributing requests across concurrent Vercel function instances.

## Acceptance Criteria

1. `lib/api/rate-limit.ts` no longer uses a module-level `Map` as its backing store.
2. Rate limiting state is stored in a persistent, shared store that survives cold starts and is visible across concurrent instances — either Vercel KV or Upstash Redis.
3. The public interface of `rate-limit.ts` (function signatures, return types) is unchanged so no call sites need to be updated.
4. If the backing store is unavailable (e.g., KV connection failure), the rate limiter fails open (allows the request through) and logs a warning rather than crashing the handler.
5. Rate limits are enforced correctly: a single IP/key cannot exceed the configured limit within the window regardless of which serverless instance handles each request.

## Tasks / Subtasks

- [x] Choose backing store (AC: 2)
  - [x] Check if Vercel KV is already provisioned for this project (check `vercel.json` and env vars for `KV_REST_API_URL`)
  - [x] If not: prefer Upstash Redis (free tier, no Vercel plan requirement) — install `@upstash/ratelimit` and `@upstash/redis`
- [x] Rewrite `lib/api/rate-limit.ts` (AC: 1, 2, 3, 4)
  - [x] If using Upstash: use `@upstash/ratelimit` with `Ratelimit.slidingWindow()` — it's a drop-in that handles the distributed state problem
  - [x] Preserve the same exported function/type signatures
  - [x] Wrap store calls in try/catch; on failure, log warning and return `{ success: true }` (fail open)
- [x] Add required env vars to `ENV_TEMPLATE.txt` (AC: 2)
- [x] Verify all existing call sites still work without changes (AC: 3)

## Dev Notes

- Current implementation to replace in `lib/api/rate-limit.ts`:
  ```ts
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  ```
  This Map resets on every cold start and is not shared across instances.
- Upstash approach (recommended — minimal dependencies):
  ```ts
  import { Ratelimit } from '@upstash/ratelimit';
  import { Redis } from '@upstash/redis';
  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '10 s'),
  });
  ```
  Env vars needed: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- Fail-open pattern is intentional: a rate limiter outage should degrade gracefully, not take down the API.
- If Vercel KV is already in use for something else, `@vercel/kv` can be used instead of Upstash — check existing env vars first.

### Project Structure Notes

- File to rewrite: `lib/api/rate-limit.ts`
- Supporting files: `ENV_TEMPLATE.txt`, `package.json` (new dep)
- No changes needed to routes that call the rate limiter

### References

- [Source: DogYenta_QA_Report.docx — MEDIUM: In-Memory Rate Limiter is Ineffective on Serverless]
- Upstash Ratelimit docs: https://upstash.com/docs/oss/sdks/ts/ratelimit/overview

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None.

### Completion Notes List

- No Vercel KV provisioned; used Upstash Redis (`@upstash/ratelimit` + `@upstash/redis` — already in package.json).
- Replaced module-level `Map` with `Ratelimit.slidingWindow()` backed by `Redis.fromEnv()`.
- Redis and Ratelimit instances are lazily created and module-level cached.
- All public async helpers now return `Promise` types (necessary for Upstash network call). No call sites exist so non-breaking.
- Fails open on missing env vars and on store errors (try/catch with `console.warn`).

### File List

- `frontend/lib/api/rate-limit.ts` — rewritten
- `frontend/ENV_TEMPLATE.txt` — added `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
