# Cursor Implementation Instructions

## 1. Shared OpenAI helper
- Add `frontend/lib/openai-client.ts` that memoizes an `OpenAI` client configured for the Responses API.
- Validate `OPENAI_API_KEY` once inside the helper and expose `isOpenAIConfigured()` for route guards.
- Provide thin wrappers like `runResponse`, `runStructuredResponse`, and `runTextResponse` so API routes never touch the SDK directly.

## 2. Migrate API routes to the Responses API
- Update `frontend/app/api/test-ai/route.ts`, `frontend/app/api/ai-reasoning/route.ts`, `frontend/app/api/infer-traits/route.ts`, and `frontend/app/api/normalize-guidance/route.ts` to import the helper.
- Replace legacy `chat.completions.create` calls with `responses.create`, using the helper’s normalized output instead of manually reading `choices[0]`.
- Standardize on a Responses-compatible model such as `gpt-4o-mini`.

## 3. Remove brittle post-processing
- Delete legacy parsing utilities like `utils/parseLLM.ts` once the Responses API provides schema-enforced outputs.
- Use `response_format: { type: 'json_schema', ... }` for structured results so no custom regex or Markdown stripping remains.
- For free-form text, return `output_text` directly (only guard against empty strings).

## 4. Temperament-aware reasoning
- Ensure `/api/ai-reasoning` receives a `temperaments: string[]` payload and forwards it in the user message.
- Extend the system prompt so the model cross-references adopter temperaments with breed traits and cites adopter language in parentheses.
- Encode citation requirements directly in the JSON schema descriptions for the `primary`, `additional`, and `concerns` fields.
- Update fixtures/tests to include temperament arrays and assert the presence of citation-style text.

## 5. Input sanitization & logging
- Sanitize numeric inputs (e.g., `max_tokens`, `temperature`) with `Number.isFinite` checks before calling the helper.
- Keep logging minimal and avoid emitting adopter PII even when `DEBUG_REASONING` is enabled.

## 6. Matching logic guidance
- Treat every adopter input as an **OR** filter when assembling prompts or interpreting responses: no single field is mandatory for a match.
- Sort recommendations by overall fit instead of requiring all preferences to align; the model should explain partial matches and cite which preferences were satisfied.

## 7. Documentation updates
- Refresh inline comments and docs to reference the Responses API instead of Chat Completions.
- Note that temperament preferences are required for `top-pick` reasoning and that outputs now cite adopter language and temperament choices explicitly.

## 8. Results page hang investigation
- **Root cause:** `ResultsPageContent` keeps the global `loading` spinner up until the `/api/match-dogs` POST completes, even though `listDogs` already returned data. When the match-dogs route waits on OpenAI (via `generateTop3Reasoning` → `/api/ai-reasoning` → `runStructuredResponse`), any latency or timeout in the OpenAI call blocks the whole response, so the staging URL sits on "Loading dogs..." indefinitely.【F:frontend/app/results/page.tsx†L247-L427】【F:frontend/lib/explanation.ts†L165-L238】【F:frontend/lib/openai-client.ts†L72-L159】
- **Cursor fix instructions:**
  1. Refactor `fetchDogs()` inside `ResultsPageContent` so `setLoading(false)` runs right after `listDogs` resolves; start the `/api/match-dogs` request in a separate async branch with its own `matchingLoading` state and render placeholders for top picks while that call finishes.【F:frontend/app/results/page.tsx†L247-L427】
  2. In the `/api/match-dogs` pipeline, wrap each call to `generateTop3Reasoning` in a hard timeout (e.g., `AbortController` or `Promise.race`) so OpenAI latency cannot stall the entire response. If the timeout trips—or if `OPENAI_API_KEY` is missing—skip the AI call and fall back to deterministic copy immediately.【F:frontend/lib/explanation.ts†L165-L238】
  3. Update `/api/ai-reasoning` and `runResponse` to pass through fetch/request-level timeouts (and surface failures quickly) instead of waiting for the SDK’s default long polling; log timeout metrics so we can monitor the slow path.【F:frontend/app/api/ai-reasoning/route.ts†L20-L88】【F:frontend/lib/openai-client.ts†L72-L159】
  4. Add defensive handling on the client so, if the match-dogs call still errors or exceeds a threshold, we show dogs with a banner explaining that tailored reasoning is temporarily unavailable instead of leaving the spinner up forever.【F:frontend/app/results/page.tsx†L247-L427】
