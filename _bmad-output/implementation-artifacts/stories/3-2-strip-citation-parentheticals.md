# Story 3.2: Strip Citation-Style Parentheticals from AI-Generated Blurbs

Status: in-progress

## Story

As a **Dog Yenta user receiving a match email or viewing results on the site**,
I want the "Why this dog fits" blurb to read as natural prose,
so that I'm not distracted by AI citation artifacts like "(requested: baby, medium)" that break the reading experience.

## Acceptance Criteria

1. **Given** an AI blurb containing `(requested: ...)`, `(mentioned: ...)`, or `(requested temperament: ...)` parentheticals, **when** it is processed, **then** those patterns are stripped before the text is used anywhere.
2. **Given** non-citation parenthetical content (e.g., em-dashes, natural prose asides like "(and she's crate trained)"), **when** the stripping runs, **then** that content is preserved unchanged.
3. **Given** double spaces or orphaned punctuation left behind by stripping, **when** the cleanup runs, **then** the text is normalized (double-spaces collapsed, leading/trailing commas removed).
4. **Given** the email dog card blurb, **when** the fix is deployed, **then** production emails no longer contain citation parentheticals (confirmed by reference email showing `(requested: baby, medium)` in live mail).
5. **Given** the UI results view, **when** the fix is deployed, **then** the same blurb text renders cleanly without citations.

## Tasks / Subtasks

- [x] Fix the AI prompt to stop generating citations at source (AC: #1, #4, #5)
  - [x] In `frontend/lib/explanation.ts`, `createTop3Prompt()`, find the line (approx line 125-126):
    ```
    `Naturally weave in which user preferences were satisfied, using brief parenthetical citations (e.g., "(requested: calm temperament)"). Acknowledge any gaps positively without discarding the dog. Only cite preferences explicitly listed below — do not invent any.`
    ```
  - [x] Replace with version that drops the citation instruction:
    ```
    `Naturally weave in which user preferences were satisfied. Acknowledge any gaps positively without discarding the dog. Only reference preferences explicitly listed below — do not invent any.`
    ```
- [x] Add belt-and-suspenders post-processing strip in `explanation.ts` (AC: #1, #2, #3)
  - [x] After the `applyDogPronouns()` call in `generateTop3Reasoning()` (approx line 326), add a `stripCitationParentheticals()` call
  - [x] Implement `stripCitationParentheticals(text: string): string` that:
    - Strips `(requested: [^)]+)` patterns
    - Strips `(mentioned: [^)]+)` patterns
    - Strips `(requested temperament: [^)]+)` patterns
    - Normalizes leftover double spaces and dangling punctuation
- [x] Verify fallback path is also clean (AC: #1)
  - [x] Apply the same strip to the fallback reasoning path (the `fb.primary` returned from `generateFallbackTop3Reasoning()`) — fallback doesn't use the prompt so citations shouldn't appear there, but confirm

## Dev Notes

- **Root cause is in the prompt, not post-processing.** `createTop3Prompt()` at line 125-126 in `explanation.ts` explicitly instructs the AI: *"using brief parenthetical citations (e.g., '(requested: calm temperament)')"*. That's why they appear. Fixing the prompt is the primary fix. Post-processing strip is defense-in-depth.
- **The blurb path through the codebase:**
  1. `generateTop3Reasoning()` → returns `{ primary: string }` after all post-processing
  2. `fetchAIReasoningForDogs()` in `lib/email/service.ts` calls `generateTop3Reasoning()`
  3. Cron route maps result into `emailMatches[i].reasons.primary150`
  4. `sendDogMatchAlert()` → `generateEmailHTML()` → `generateDogCard()` renders `reasons.primary150`
  5. UI: same `generateTop3Reasoning()` is called client-side (via `/api/ai-reasoning` HTTP path) and rendered in results view
- **Do NOT strip all parentheticals** — natural prose asides like "(and she's crate trained)" or "(at about 23 pounds now)" must be preserved. Only target the `(requested: ...)`, `(mentioned: ...)`, `(requested temperament: ...)` patterns.
- **Regex pattern** (safe, non-greedy): `/\((?:requested(?: temperament)?|mentioned):[^)]+\)/gi`
- **After stripping**, run `.replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim()` to clean up orphaned punctuation.
- **Do not modify `sanitizeReasoning()`** — that function is for a different purpose (removing default claims, location claims). Add a new `stripCitationParentheticals()` function and call it in the main path.
- **`generateAllMatchesReasoning()` at line 365 returns `''` immediately** — it's already a no-op, no changes needed there.

### Project Structure Notes

- Primary file: `frontend/lib/explanation.ts`
  - `createTop3Prompt()` — fix the prompt instruction (~line 125)
  - `generateTop3Reasoning()` — add post-processing call (~line 326, after `applyDogPronouns()`)
  - Add new `stripCitationParentheticals()` function (can go near `scrubPII()`)
- Email render: `frontend/lib/email/service.ts` — read context only, no changes needed
- No database changes, no schema changes

### References

- [Source: frontend/lib/explanation.ts#L121-L136] — `createTop3Prompt()` header construction with citation instruction
- [Source: frontend/lib/explanation.ts#L319-L330] — post-processing chain in `generateTop3Reasoning()` where strip should be added
- [Source: frontend/lib/explanation.ts#L466-L479] — `scrubPII()` — pattern to follow for the new strip function
- [Source: frontend/lib/email/service.ts#L1-L100] — email service, `fetchAIReasoningForDogs()` is the consumer

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Prompt fix (Task 1): Removed citation instruction from `createTop3Prompt()` in `explanation.ts`. The line instructing the LLM to use `(e.g., "(requested: calm temperament)")` parenthetical citations was replaced with prose-only instruction.
- New function (Task 2): Added `stripCitationParentheticals()` near `scrubPII()` using the regex `/\((?:requested(?: temperament)?|mentioned):[^)]+\)/gi`. Only targets known citation patterns; natural parenthetical prose is preserved.
- Post-processing chain (Task 3): Changed `processed = applyDogPronouns(processed, pronouns)` to `processed = stripCitationParentheticals(applyDogPronouns(processed, pronouns))` in the primary AI path.
- Fallback path audit (Task 4): `generateFallbackTop3Reasoning()` constructs blurbs via string concatenation and hardcoded breed descriptions — it does not use the AI prompt, so citation patterns cannot appear there organically. Applied `stripCitationParentheticals()` defensively to the fallback path as well (no-op in normal operation).

### File List

- `frontend/lib/explanation.ts`
