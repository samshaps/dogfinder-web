# v2 Refactor Plan

This doc lists scoped improvements to harden the app and keep maintenance simple. The previously proposed "rate‑aware logging" module is cut from scope.

## Modules

### Module 1: Config and Types Foundation ✅ COMPLETE (with nice-to-haves pending)
- Goals
  - Single source of truth for env/config.
  - Strong types for DB rows; minimize `any` in API routes.
- Tasks
  - ✅ Create `frontend/lib/config.ts` exporting all envs (Stripe, Resend, Supabase, secrets) with runtime guards and redaction helper.
  - ✅ Add `frontend/types/supabase.ts` row types for `users`, `plans`, `alert_settings`, `preferences`, `email_events`, `dog_cache`.
  - ⚠️ **Nice-to-have (deprioritized)**: Typed helpers `getUserIdByEmail`, `getPlanByUserId`, `updatePlan` - routes can query directly or refactor when touching these areas.
  - ✅ Response helpers `okJson`, `errJson` for consistent APIs (implemented in `lib/api/helpers.ts`).

### Module 2: Email + Cron Hardening ✅ COMPLETE (with nice-to-haves pending)
- Goals
  - Robust, observable email pipeline within provider limits.
- Tasks
  - ⚠️ **Nice-to-have (deprioritized)**: Extract tag/email sanitizers to `frontend/lib/email/util.ts` - sanitization exists inline and works fine.
  - ✅ Centralize token jti consume/check helper (implemented in `lib/tokens.ts`).
  - ⚠️ **Nice-to-have (deprioritized)**: Cron chunking - current sequential processing works for current scale, only matters at very high volumes.

### Module 3: Plan Sync Consolidation (Stripe) ✅ COMPLETE
- Goals
  - One place to mutate plan state; idempotent transitions.
- Tasks
  - ✅ `frontend/lib/stripe/plan-sync.ts` with `setPlan(userId, nextState)` - fully implemented with idempotency support.
  - ✅ Webhook + unsubscribe route to use the shared function - both routes now use `setPlan()`.
  - ✅ Store Stripe event `id` for idempotency - implemented in `setPlan()` function.

### Module 4: API Structure and Error Hygiene ✅ COMPLETE (partial route adoption)
- Goals
  - Consistent auth guards and error output.
- Tasks
  - ✅ `frontend/lib/api/helpers.ts`: `requireSession`, `okJson`, `errJson`, redacting logger - all implemented.
  - ⚠️ **In Progress**: Refactor routes to reuse helpers - `preferences`, `unsubscribe`, and webhook routes updated. Other routes can be migrated incrementally as they're touched.

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

## Completed Critical & Important Items ✅

**Critical:**
- ✅ Module 4: `requireSession` helper - prevents auth bugs
- ✅ Module 3: `setPlan()` function - prevents billing inconsistencies

**Important:**
- ✅ Module 3: Stripe event ID storage - improved auditability and idempotency
- ✅ Module 4: `okJson`/`errJson` helpers - consistency improvements
- ✅ Module 2: Centralized token jti helper - prevents token reuse bugs

## Nice-to-Have Items (Deprioritized) 📝

These items are documented but deprioritized as they provide marginal value for current needs:

### Module 1 Nice-to-Haves
- Typed helper functions (`getUserIdByEmail`, `getPlanByUserId`, `updatePlan`) - routes can query directly. Refactor when touching these areas for better maintainability.

### Module 2 Nice-to-Haves
- Email/tag sanitizer extraction to `lib/email/util.ts` - sanitization exists inline and works fine. Extract if email code needs significant cleanup.
- Cron chunking/batching - current sequential processing works for current scale. Only matters at very high volumes or if hitting provider limits.

## Out of Scope (cut)
- Rate‑aware logging for Petfinder (can revisit later if needed).

## Acceptance
- Module 1 types/config adopted by 2 exemplar routes.
- Email + cron resilient; plan updates centralized; APIs uniform.
- Docs capture env/secrets/ops.
