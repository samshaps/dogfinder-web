# v2 Refactor Plan

This doc lists scoped improvements to harden the app and keep maintenance simple. The previously proposed “rate‑aware logging” module is cut from scope.

## Modules

### Module 1: Config and Types Foundation
- Goals
  - Single source of truth for env/config.
  - Strong types for DB rows; minimize `any` in API routes.
- Tasks
  - Create `frontend/lib/config.ts` exporting all envs (Stripe, Resend, Supabase, secrets) with runtime guards and redaction helper.
  - Add `frontend/types/supabase.ts` row types for `users`, `plans`, `alert_settings`, `preferences`, `email_events`, `dog_cache`.
  - Typed helpers: `getUserIdByEmail`, `getPlanByUserId`, `updatePlan`.
  - Response helpers `okJson`, `errJson` for consistent APIs.

### Module 2: Email + Cron Hardening
- Goals
  - Robust, observable email pipeline within provider limits.
- Tasks
  - Extract tag/email sanitizers to `frontend/lib/email/util.ts`.
  - Centralize token jti consume/check helper.
  - Cron: process users in chunks; structured result stats; continue on partial failures.

### Module 3: Plan Sync Consolidation (Stripe)
- Goals
  - One place to mutate plan state; idempotent transitions.
- Tasks
  - `frontend/lib/stripe/plan-sync.ts` with `setPlan(userId, nextState)`.
  - Webhook + unsubscribe route to use the shared function.
  - Optional: store Stripe event `id` for idempotency.

### Module 4: API Structure and Error Hygiene
- Goals
  - Consistent auth guards and error output.
- Tasks
  - `frontend/lib/api-helpers.ts`: `requireSession`, `okJson`, `errJson`, redacting logger.
  - Refactor routes to reuse helpers.

### Module 5: UI/UX & A11y Polish
- Goals
  - Clear copy; hide irrelevant controls; ARIA improvements.
- Tasks
  - Profile plan badge/CTA copy pass.
  - Unsubscribe token flow: explicit expired/used token guidance.

### Module 6: Docs & Operational Playbook
- Goals
  - Easy onboarding and reliable operations.
- Tasks
  - Keep this plan current.
  - Add `docs/operational-playbook.md` (env matrix, secrets rotation, cron schedule, Resend/Stripe settings, incident runbook).

### Module 7: Repo Hygiene
- Goals
  - Clean tree; consistent linting.
- Tasks
  - Remove empty/duplicate folders (e.g., `app/... 2/` variants).
  - Optional script `npm run clean:empty` for local cleanup.

## Out of Scope (cut)
- Rate‑aware logging for Petfinder (can revisit later if needed).

## Acceptance
- Module 1 types/config adopted by 2 exemplar routes.
- Email + cron resilient; plan updates centralized; APIs uniform.
- Docs capture env/secrets/ops.
