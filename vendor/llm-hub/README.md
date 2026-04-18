# llm-hub

Reusable TypeScript monorepo for provider-agnostic LLM connection management.

## Packages

- `packages/llm-hub-core`: schema-driven provider registry, auth flows, credential storage, model catalog, and service API
- `packages/llm-hub-server`: reusable HTTP layer backed by `llm-hub-core`
- `packages/llm-hub-ui`: reusable React rendering layer backed by the server contract
- `packages/llm-hub-demo`: thin example host app that consumes `llm-hub-ui`

## Package roles

- `@llm-hub/core` owns provider/auth/model/setup logic
- `@llm-hub/server` owns the reusable backend contract
- `@llm-hub/ui` owns generic schema-driven React rendering
- `@llm-hub/demo` proves the reusable packages can be composed into an app without hardcoded provider forms
