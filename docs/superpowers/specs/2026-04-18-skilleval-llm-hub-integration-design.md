# SkillEval llm-hub Integration Design

**Date:** 2026-04-18

## Goal

Install and adapt `SkillEval` so it supports more than the built-in Anthropic browser API path, using the existing `llm-hub` framework as the provider/auth/model runtime.

V1 must prioritize speed to working software over perfect provider branding. The initial target is:

- Gemini via API key
- Codex via the existing OAuth-compatible bridge available through `llm-hub`

## Current State

`SkillEval` is currently a browser-only Vite app that:

- stores a raw API key in browser `localStorage`
- sends generation, config-generation, and judging requests directly to Anthropic from the browser
- hardcodes Anthropic model ids in settings and evaluation views
- builds Anthropic-shaped multimodal judge payloads for screenshot-based evaluation

`llm-hub` already provides:

- provider registry and model catalog
- API-key and OAuth-capable auth flows
- local credential persistence
- reusable settings UI components
- a provider-agnostic `/chat` endpoint backed by AI SDK providers

## V1 Scope

### In scope

- Replace direct Anthropic browser calls with `llm-hub`
- Add provider connection UI to SkillEval settings
- Support Gemini API-key auth
- Support Codex through the existing OAuth-compatible bridge path
- Support provider/model selection for:
  - config generation
  - evaluation generation
  - judging
- Preserve current SkillEval evaluation workflow and results UX
- Preserve screenshot-based visual judging

### Out of scope

- Native OpenAI/Codex-branded OAuth implementation in `llm-hub`
- Broad provider expansion beyond what the existing `llm-hub` stack can support quickly
- Replacing SkillEval's core evaluation UI with the `llm-hub` demo shell
- Shared credential/state storage with other `llm-hub` host apps

## Product Requirements

### Functional requirements

- A user can connect Gemini with an API key from the SkillEval settings page.
- A user can connect Codex through the existing OAuth-compatible bridge from the SkillEval settings page.
- Connected models appear in SkillEval model selectors.
- The user can pick separate defaults for:
  - config generation
  - eval generation
  - judging
- SkillEval can run text-only and visual evals without direct provider-specific browser API calls.
- SkillEval can continue generating screenshots through the screenshot server.

### Non-functional requirements

- No raw provider secrets are stored in SkillEval browser storage.
- Provider connection state is isolated to this SkillEval installation.
- Runtime startup is explicit and reproducible.
- Known provider capability mismatches are handled in the UI before runtime failure when possible.

## Architectural Decision

Use `llm-hub` as a local sidecar service for auth, model discovery, and inference, while keeping SkillEval as the host application for eval configuration, execution, and results.

This is a sidecar integration, not a rewrite.

### Why this approach

- It removes the Anthropic-only transport without discarding SkillEval's existing product UX.
- It reuses the user's existing auth and provider framework.
- It avoids building native OpenAI OAuth now, which is slower and unnecessary for V1.
- It keeps provider-specific logic out of SkillEval as much as possible.

## Runtime Topology

SkillEval V1 will run as three local processes:

1. SkillEval Vite app
2. SkillEval screenshot server
3. SkillEval-scoped `llm-hub` server

### Required port change

Current defaults conflict:

- SkillEval screenshot server uses `3001`
- `llm-hub` server also defaults to `3001`

V1 must assign distinct ports. Recommended defaults:

- SkillEval app: `5173`
- screenshot server: `3001`
- `llm-hub` server: `3002`

### Required environment variables

- `VITE_LLM_HUB_SERVER_URL`
- `VITE_SCREENSHOT_SERVER_URL`
- `LLM_HUB_SERVER_PORT`
- `LLM_HUB_SERVER_BASE_DIR`
- `LLM_HUB_SERVER_PUBLIC_BASE_URL` when OAuth callback URL generation needs it

## Storage Model

SkillEval browser storage should keep only host-app state such as:

- uploaded skill content
- prompts
- criteria
- selected model references
- theme and host preferences

Secrets and provider credentials must live in SkillEval's dedicated `llm-hub` storage directory, for example a local `.llm-hub` folder rooted under the SkillEval app workspace or another SkillEval-specific base dir.

### Persisted model selections

SkillEval must stop persisting raw model strings like `claude-sonnet-4-6-20260217`.

Instead, it should persist:

```json
{
  "providerId": "gemini",
  "modelId": "gemini-2.5-pro"
}
```

for each of:

- `defaultConfigGenModel`
- `defaultEvalModel`
- `defaultJudgeModel`

`llm-hub`'s single server default model should not be overloaded to represent all three SkillEval stages.

## UI Design

### Settings page

The SkillEval settings page becomes a hybrid page:

- SkillEval-owned preferences
- embedded `llm-hub` provider connection UI
- SkillEval-owned default model selectors

### Settings behaviors

- Connection management is handled through `llm-hub`.
- SkillEval no longer asks for a raw Anthropic API key.
- The existing "API key required" language must be replaced with "provider connection required" language.
- If no connected provider/model is available for a required stage, the UI blocks that action with a clear error.

### Model filtering rules

- Config generation:
  - language models only
  - preferably restricted to a vetted subset if structured generation remains prompt-and-parse in V1
- Eval generation:
  - connected language models
- Judge model for `text`:
  - connected language models
- Judge model for `visual` or `both`:
  - connected language models with vision support only

## Inference Integration

### Transport replacement

Replace SkillEval's direct Anthropic client with a small host adapter that calls `llm-hub /chat`.

This adapter becomes the single inference boundary used by:

- config generation
- eval generation
- judging

### Message shape normalization

SkillEval currently builds Anthropic-specific multimodal content blocks. V1 must not pass those payloads through unchanged.

Add a message-normalization layer that converts SkillEval judge inputs into a provider-agnostic format accepted by the `llm-hub` server and AI SDK stack.

This is a required implementation task, not optional cleanup.

## Config Generation Strategy

SkillEval's auto-config generator currently relies on JSON-oriented prompting and response parsing.

### Preferred approach

Add structured generation support to `llm-hub`, such as an object-generation or schema-constrained inference path that SkillEval can call for config generation.

### Acceptable V1 fallback

Keep prompt-and-parse generation temporarily, but:

- restrict model choices to models known to behave well for this task
- validate the returned structure strictly
- keep the current fallback config behavior

### Decision

V1 may start with the fallback approach if it materially reduces time to first working install, but the design should preserve a clean upgrade path to structured generation.

## Visual Judging

Visual judging remains a two-step flow:

1. render HTML outputs through the screenshot server
2. send screenshots and optional source content to the selected judge model

### Compatibility requirement

Only models with vision capability may be selectable for visual or mixed judging.

### Failure behavior

- If screenshot capture fails, the eval should surface a clear status and avoid silently pretending visual judging succeeded.
- If the selected judge model lacks vision support, the UI should prevent the run before it starts.

## Provider Scope for V1

### Gemini

- auth mode: API key
- supported in V1

### Codex

- auth mode: existing OAuth-compatible bridge path
- supported in V1
- V1 does not require first-class native Codex/OpenAI OAuth branding in the provider list if the bridge path is functionally equivalent

### Future work

- native OpenAI/Codex OAuth provider definition
- broader provider catalog
- richer provider-specific capability surfacing

## Reliability and Rate Limiting

Current SkillEval runs generations and judgments in broad parallel fan-out. That is risky across heterogeneous providers.

V1 should introduce a concurrency limiter for:

- eval generation
- judging

The limiter can be simple, but it must exist to reduce provider throttling and improve run stability.

## Error Handling

### Required user-facing errors

- no provider connected
- no model selected for required stage
- selected model not compatible with visual judging
- `llm-hub` server unavailable
- screenshot server unavailable
- provider auth expired or invalid
- config-generation parse failure

### Required system behavior

- fail fast on missing runtime dependencies
- expose health checks for the sidecar services
- preserve partial eval results where possible

## Testing Strategy

### Manual verification

V1 must be verified end-to-end for:

1. Gemini API-key connection
2. Codex bridge OAuth connection
3. config generation
4. text-only eval generation
5. visual eval generation and judging
6. disconnected-provider and unavailable-server error states

### Automated verification targets

- adapter-level tests for the new SkillEval to `llm-hub` inference boundary
- message-normalization tests for multimodal judge input
- settings persistence tests for provider/model pair storage
- capability-filtering tests for model selectors

## Implementation Sequence

1. Add runtime configuration and resolve the screenshot/`llm-hub` port collision.
2. Add SkillEval-local `llm-hub` bootstrap and isolated storage.
3. Replace SkillEval's direct Anthropic transport with an `llm-hub` adapter.
4. Refactor settings and local persistence to provider/model pairs.
5. Integrate provider connection UI into the SkillEval settings page.
6. Replace hardcoded model lists with connected-model queries and capability filters.
7. Add multimodal message normalization for judge requests.
8. Add concurrency limiting to eval generation and judging.
9. Verify Gemini and Codex bridge flows end-to-end.

## Risks

### Highest risk

- Multimodal payload translation may require small `llm-hub` server changes if the current `/chat` surface is too minimal for the existing SkillEval judge flow.

### Medium risk

- The Codex bridge path may expose provider metadata that is not ideal for end-user naming in the UI.
- Prompt-and-parse config generation may be weaker on some connected models than the current Anthropic-only path.

### Low risk

- Settings page composition may require some styling adaptation to make `llm-hub` UI feel native inside SkillEval.

## Acceptance Criteria

- SkillEval no longer depends on direct Anthropic browser API calls.
- A user can connect Gemini and run evals.
- A user can connect Codex through the existing bridge and run evals.
- The app supports separate defaults for config generation, eval generation, and judging.
- Visual judging still works with screenshot capture and a vision-capable model.
- No raw provider secret is stored in browser local storage.
