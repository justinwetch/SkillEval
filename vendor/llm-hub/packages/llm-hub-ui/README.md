# @llm-hub/ui

`@llm-hub/ui` is the reusable React rendering layer for `llm-hub`.

It renders provider setup, auth selection, status summaries, and model selection from the `@llm-hub/server` contract without hardcoded provider-specific forms.

## What it exports

- reusable components
- a small adapter boundary (`LLMHubUIAdapter`)
- a default fetch-based adapter (`FetchLLMHubUIAdapter`)
- generic hooks and helpers for schema-driven rendering
- neutral CSS in `@llm-hub/ui/styles.css`

## Install / import

```tsx
import '@llm-hub/ui/styles.css';
import {
  FetchLLMHubUIAdapter,
  ConnectionSchemaRenderer,
  ProviderCard,
  AuthMethodSelector,
  ModelSelector,
} from '@llm-hub/ui';
```

## Adapter boundary

The UI package consumes an adapter instead of a demo-specific client.

Core methods:

- `getProviders()`
- `getConnectedProviders()`
- `getAuthMethods(providerId)`
- `getUISchema(providerId, methodId, hostMode)`
- `connect(providerId, body)`
- `disconnect(providerId)`
- `testConnection(providerId)`
- `getModels(providerId?)`
- `setDefaultModel(providerId, modelId)`
- `startOAuth(providerId, callbackUrl)`
- `chat(body)`
- `embed(body)`

## Usage examples

### Provider list only

```tsx
const adapter = new FetchLLMHubUIAdapter('http://localhost:3001');
const providers = await adapter.getProviders();

return providers.providers.map((provider) => (
  <ProviderCard
    key={provider.id}
    provider={provider}
    selected={provider.id === selectedProviderId}
    onSelect={() => setSelectedProviderId(provider.id)}
  />
));
```

### Connection renderer only

```tsx
<ConnectionSchemaRenderer
  adapter={adapter}
  provider={provider}
  authMethod={authMethod}
  hostMode="sidebar"
  onMutation={refreshEverything}
/>
```

### Model selector only

```tsx
<ModelSelector
  label="Default model"
  models={models}
  selectedProviderId={providerId}
  selectedModelId={modelId}
  onProviderChange={setProviderId}
  onModelChange={setModelId}
/>
```

### Full settings page composition

Compose `ProviderCard`, `AuthMethodSelector`, `ConnectionSchemaRenderer`, `ConnectionSummary`, and `ModelSelector` in your host app shell. The host app decides inline vs modal vs sidebar placement.

## Theming and overrides

Import `@llm-hub/ui/styles.css` and override the CSS variables it defines:

- `--llm-hub-ui-surface`
- `--llm-hub-ui-border`
- `--llm-hub-ui-text`
- `--llm-hub-ui-text-soft`
- `--llm-hub-ui-accent`
- `--llm-hub-ui-success`
- `--llm-hub-ui-warning`
- `--llm-hub-ui-danger`
- `--llm-hub-ui-radius-*`

You can scope overrides by wrapping your UI in `.llm-hub-ui-theme`.

## Reuse guidance

- Host apps can supply their own adapter implementation instead of the default fetch adapter.
- Host apps can control host mode, feedback handling, density, and modal placement.
- Provider-specific branching should stay outside this package unless isolated in a tiny documented adapter layer.
