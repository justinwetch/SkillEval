# @llm-hub/server

`@llm-hub/server` exposes the reusable `@llm-hub/core` provider, auth, schema, and model functionality over HTTP.

It is designed as shared backend infrastructure for many future apps.

## Responsibilities

- provider and connected-provider listing
- auth method and UI schema discovery
- connect, disconnect, test, and default-model flows
- OAuth PKCE start/callback handling
- chat and embed passthrough endpoints backed by `@llm-hub/core`

## Environment

- `LLM_HUB_SERVER_PORT`: HTTP port for the standalone server entry
- `LLM_HUB_SERVER_BASE_DIR`: working directory used for `.llm-hub` persistence
- `LLM_HUB_SERVER_PUBLIC_BASE_URL`: optional public base URL used for OAuth callback URLs

## Endpoints

- `GET /providers`
- `GET /providers/connected`
- `GET /providers/:id/auth-methods`
- `GET /providers/:id/ui-schema`
- `POST /providers/:id/connect`
- `POST /providers/:id/disconnect`
- `POST /providers/:id/test`
- `GET /models`
- `POST /default-model`
- `GET /oauth/:provider/start`
- `GET /oauth/:provider/callback`
- `POST /chat`
- `POST /embed`
