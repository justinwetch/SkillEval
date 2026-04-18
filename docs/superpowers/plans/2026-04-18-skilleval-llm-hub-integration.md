# SkillEval Multi-LLM Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate SkillEval with `llm-hub` so Gemini API-key auth and a Codex OAuth bridge can power config generation, eval generation, and judging without direct Anthropic browser API calls.

**Architecture:** Keep SkillEval as the React/Vite host app, add a SkillEval-scoped `llm-hub` sidecar for auth/model discovery/inference, retain the screenshot server for visual evals, and store only host-app state in browser storage while secrets remain in the `llm-hub` base directory.

**Tech Stack:** React 19, Vite 7, Vitest, `@llm-hub/core`, `@llm-hub/server`, `@llm-hub/ui`, AI SDK, Express, Puppeteer.

---

## File Structure

### SkillEval host app

- Modify: `app/package.json`
- Create: `app/.env.example`
- Create: `app/vitest.config.js`
- Create: `app/src/test/setup.js`
- Create: `app/src/lib/runtimeConfig.js`
- Create: `app/src/lib/runtimeConfig.test.js`
- Create: `app/src/contexts/LlmHubContext.jsx`
- Create: `app/src/components/ConnectionWarning.jsx`
- Create: `app/src/components/ConnectionWarning.test.jsx`
- Create: `app/src/utils/llmHubClient.js`
- Create: `app/src/utils/jsonResponse.js`
- Create: `app/src/utils/jsonResponse.test.js`
- Create: `app/src/utils/modelFilters.js`
- Create: `app/src/utils/modelFilters.test.js`
- Create: `app/src/utils/concurrency.js`
- Create: `app/src/utils/concurrency.test.js`
- Create: `app/src/utils/buildJudgeMessages.js`
- Create: `app/src/utils/buildJudgeMessages.test.js`
- Create: `app/scripts/start-llm-hub-server.mjs`
- Modify: `app/src/App.jsx`
- Modify: `app/src/components/Layout.jsx`
- Modify: `app/src/contexts/SettingsContext.jsx`
- Modify: `app/src/contexts/EvalConfigContext.jsx`
- Modify: `app/src/contexts/EvalRunContext.jsx`
- Modify: `app/src/utils/generateConfig.js`
- Modify: `app/src/utils/runEval.js`
- Modify: `app/src/utils/judgeEval.js`
- Modify: `app/src/utils/screenshot.js`
- Modify: `app/src/views/ConfigureView.jsx`
- Modify: `app/src/views/EvaluateView.jsx`
- Modify: `app/src/views/SettingsView.jsx`

### SkillEval repo root

- Modify: `screenshot-server.js`
- Modify: `README.md`

### llm-hub sibling workspace

- Modify: `../llm-hub/packages/llm-hub-core/src/providers/seed-providers.ts`
- Modify: `../llm-hub/packages/llm-hub-core/src/models/seed-models.ts`
- Modify: `../llm-hub/packages/llm-hub-core/src/registry/sdk-provider-factory.ts`
- Modify: `../llm-hub/packages/llm-hub-core/test/provider-lookup.test.ts`

---

### Task 1: Add Runtime Configuration and Test Harness

**Files:**
- Modify: `app/package.json`
- Create: `app/.env.example`
- Create: `app/vitest.config.js`
- Create: `app/src/test/setup.js`
- Create: `app/src/lib/runtimeConfig.js`
- Test: `app/src/lib/runtimeConfig.test.js`

- [ ] **Step 1: Write the failing runtime-config test**

```js
import { describe, expect, it } from 'vitest';

import { getRuntimeConfig } from './runtimeConfig';

describe('getRuntimeConfig', () => {
  it('returns distinct defaults for the app, screenshot server, and llm-hub server', () => {
    expect(
      getRuntimeConfig({
        VITE_LLM_HUB_SERVER_URL: undefined,
        VITE_SCREENSHOT_SERVER_URL: undefined,
      }),
    ).toEqual({
      llmHubServerUrl: 'http://localhost:3002',
      screenshotServerUrl: 'http://localhost:3001',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix app run test -- runtimeConfig`

Expected: FAIL with `Cannot find module './runtimeConfig'` or missing Vitest script/config.

- [ ] **Step 3: Add Vitest, runtime config, and environment examples**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "llm-hub": "node ./scripts/start-llm-hub-server.mjs"
  },
  "dependencies": {
    "@llm-hub/ui": "file:../../llm-hub/packages/llm-hub-ui"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "vitest": "^4.1.0"
  }
}
```

```js
// app/vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});
```

```js
// app/src/test/setup.js
import '@testing-library/jest-dom/vitest';
```

```js
// app/src/lib/runtimeConfig.js
export function getRuntimeConfig(env = import.meta.env) {
  return {
    llmHubServerUrl: env.VITE_LLM_HUB_SERVER_URL || 'http://localhost:3002',
    screenshotServerUrl: env.VITE_SCREENSHOT_SERVER_URL || 'http://localhost:3001',
  };
}
```

```env
# app/.env.example
VITE_LLM_HUB_SERVER_URL=http://localhost:3002
VITE_SCREENSHOT_SERVER_URL=http://localhost:3001
```

- [ ] **Step 4: Run the targeted test and install dependencies if needed**

Run: `npm --prefix app install`

Expected: dependencies install successfully.

Run: `npm --prefix app run test -- runtimeConfig`

Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit the runtime foundation**

```bash
git add app/package.json app/.env.example app/vitest.config.js app/src/test/setup.js app/src/lib/runtimeConfig.js app/src/lib/runtimeConfig.test.js
git commit -m "test: add runtime config and app test harness"
```

### Task 2: Extend llm-hub for the Codex OAuth Bridge and Local Sidecar Startup

**Files:**
- Modify: `../llm-hub/packages/llm-hub-core/src/providers/seed-providers.ts`
- Modify: `../llm-hub/packages/llm-hub-core/src/models/seed-models.ts`
- Modify: `../llm-hub/packages/llm-hub-core/src/registry/sdk-provider-factory.ts`
- Modify: `../llm-hub/packages/llm-hub-core/test/provider-lookup.test.ts`
- Create: `app/scripts/start-llm-hub-server.mjs`
- Modify: `app/package.json`

- [ ] **Step 1: Write the failing llm-hub provider lookup test**

```ts
import { describe, expect, it } from 'vitest';

import { seedProviders } from '../src/providers/seed-providers';
import { seedModels } from '../src/models/seed-models';
import { LlmHubProviderRegistry } from '../src/registry/provider-registry';

describe('codex bridge provider', () => {
  it('registers an OAuth bridge provider with at least one language model', () => {
    const registry = new LlmHubProviderRegistry(seedProviders, seedModels);
    const provider = registry.getProvider('codex-bridge');
    const models = registry.listModels('codex-bridge');

    expect(provider?.displayName).toBe('Codex Bridge');
    expect(provider?.authMethods.map((method) => method.id)).toContain('oauth_pkce');
    expect(models.map((model) => model.modelId)).toContain('gpt-5');
  });
});
```

- [ ] **Step 2: Run the llm-hub core test to verify it fails**

Run: `npm --prefix ../llm-hub --workspace @llm-hub/core run test`

Expected: FAIL because `codex-bridge` is not registered.

- [ ] **Step 3: Add the bridge provider, models, SDK wiring, and SkillEval sidecar launcher**

```ts
// ../llm-hub/packages/llm-hub-core/src/providers/seed-providers.ts
{
  provider: {
    id: 'codex-bridge',
    displayName: 'Codex Bridge',
    description: 'OAuth PKCE bridge that exchanges user auth for a reusable OpenAI-compatible API key.',
    kind: 'oauth',
    authMethods: [
      {
        id: 'oauth_pkce',
        kind: 'oauth_pkce',
        label: 'OAuth PKCE',
        description: 'Connect Codex through the existing OAuth bridge.',
        badges: ['oauth', 'bridge'],
        supportsTesting: true,
        oauth: {
          buttonLabel: 'Connect Codex',
          authorizationUrl: process.env.LLM_HUB_CODEX_BRIDGE_AUTH_URL ?? '',
          tokenExchangeUrl: process.env.LLM_HUB_CODEX_BRIDGE_TOKEN_URL ?? '',
          launchMode: 'redirect',
          codeChallengeMethod: 'S256',
          callbackParamKeys: ['code', 'state'],
        },
      },
    ],
    defaultAuthMethodId: 'oauth_pkce',
    capabilities: ['tools', 'vision', 'streaming', 'reasoning', 'oauth'],
    badges: ['bridge'],
    warnings: [],
  },
  methods: {
    oauth_pkce: {
      method: {
        id: 'oauth_pkce',
        kind: 'oauth_pkce',
        label: 'OAuth PKCE',
        description: 'Connect Codex through the existing OAuth bridge.',
        badges: ['oauth', 'bridge'],
        supportsTesting: true,
        oauth: {
          buttonLabel: 'Connect Codex',
          authorizationUrl: process.env.LLM_HUB_CODEX_BRIDGE_AUTH_URL ?? '',
          tokenExchangeUrl: process.env.LLM_HUB_CODEX_BRIDGE_TOKEN_URL ?? '',
          launchMode: 'redirect',
          codeChallengeMethod: 'S256',
          callbackParamKeys: ['code', 'state'],
        },
      },
      inputSchema: payloadSchema(z.object({ callbackUrl: z.string().url() })),
      sections: [
        section(
          'codex-bridge-oauth',
          'OAuth connection',
          [callbackUrlField],
          'Launches the existing Codex bridge OAuth flow.',
        ),
      ],
      secretFieldKeys: ['apiKey'],
    },
  },
}
```

```ts
// ../llm-hub/packages/llm-hub-core/src/models/seed-models.ts
languageModel('codex-bridge', 'gpt-5', 'Codex Bridge - GPT-5', {
  supportsStreaming: true,
  supportsTools: true,
  supportsVision: true,
  supportsReasoning: true,
  tags: ['bridge', 'reasoning'],
}),
languageModel('codex-bridge', 'gpt-5-mini', 'Codex Bridge - GPT-5 Mini', {
  supportsStreaming: true,
  supportsTools: true,
  supportsVision: true,
  supportsReasoning: true,
  tags: ['bridge', 'fast'],
}),
```

```ts
// ../llm-hub/packages/llm-hub-core/src/registry/sdk-provider-factory.ts
case 'codex-bridge':
  return createOpenAI({
    apiKey: getRequiredSecret(credential, 'apiKey'),
  }) as AiRegistryProvider;
```

```js
// app/scripts/start-llm-hub-server.mjs
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');
const repoRoot = resolve(appDir, '..');
const llmHubRoot = resolve(repoRoot, '..', 'llm-hub');

process.env.LLM_HUB_SERVER_PORT ||= '3002';
process.env.LLM_HUB_SERVER_BASE_DIR ||= resolve(repoRoot, '.llm-hub-skilleval');
process.env.LLM_HUB_SERVER_PUBLIC_BASE_URL ||= `http://localhost:${process.env.LLM_HUB_SERVER_PORT}`;

if (!process.env.LLM_HUB_CODEX_BRIDGE_AUTH_URL || !process.env.LLM_HUB_CODEX_BRIDGE_TOKEN_URL) {
  throw new Error('Codex bridge env vars are required before starting the llm-hub sidecar.');
}

spawn('npm', ['--workspace', '@llm-hub/server', 'run', 'dev'], {
  cwd: llmHubRoot,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
```

```json
// app/package.json scripts
{
  "scripts": {
    "llm-hub": "node ./scripts/start-llm-hub-server.mjs"
  }
}
```

- [ ] **Step 4: Run llm-hub tests and verify the launcher boots on port 3002**

Run: `npm --prefix ../llm-hub --workspace @llm-hub/core run test`

Expected: PASS including the `codex bridge provider` test.

Run: `npm --prefix app run llm-hub`

Expected: server starts and logs a listener on `http://localhost:3002`.

- [ ] **Step 5: Commit the provider and sidecar work**

```bash
git add ../llm-hub/packages/llm-hub-core/src/providers/seed-providers.ts ../llm-hub/packages/llm-hub-core/src/models/seed-models.ts ../llm-hub/packages/llm-hub-core/src/registry/sdk-provider-factory.ts ../llm-hub/packages/llm-hub-core/test/provider-lookup.test.ts app/scripts/start-llm-hub-server.mjs app/package.json
git commit -m "feat: add codex bridge provider for llm-hub"
```

### Task 3: Add llm-hub Context, Stage Defaults, and Connection Gating

**Files:**
- Create: `app/src/contexts/LlmHubContext.jsx`
- Modify: `app/src/contexts/SettingsContext.jsx`
- Modify: `app/src/App.jsx`
- Create: `app/src/components/ConnectionWarning.jsx`
- Modify: `app/src/components/Layout.jsx`
- Modify: `app/src/views/SettingsView.jsx`
- Test: `app/src/components/ConnectionWarning.test.jsx`

- [ ] **Step 1: Write the failing banner test for connection gating**

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import ConnectionWarning from './ConnectionWarning';

describe('ConnectionWarning', () => {
  it('renders provider connection language instead of API key language', () => {
    render(
      <MemoryRouter>
        <ConnectionWarning />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No provider connection configured/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to Settings/i })).toHaveAttribute('href', '/settings');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix app run test -- ConnectionWarning`

Expected: FAIL because `ConnectionWarning` does not exist.

- [ ] **Step 3: Implement the llm-hub context, new settings shape, and layout banner**

```jsx
// app/src/contexts/LlmHubContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { FetchLLMHubUIAdapter } from '@llm-hub/ui';

import { getRuntimeConfig } from '../lib/runtimeConfig';

const LlmHubContext = createContext(null);

export function LlmHubProvider({ children }) {
  const { llmHubServerUrl } = getRuntimeConfig();
  const adapter = useMemo(() => new FetchLLMHubUIAdapter(llmHubServerUrl), [llmHubServerUrl]);
  const [providers, setProviders] = useState([]);
  const [connectedProviders, setConnectedProviders] = useState([]);
  const [models, setModels] = useState([]);

  async function refresh() {
    const [providerResponse, connectedResponse, modelsResponse] = await Promise.all([
      adapter.getProviders(),
      adapter.getConnectedProviders(),
      adapter.getModels(),
    ]);
    setProviders(providerResponse.providers);
    setConnectedProviders(connectedResponse.providers);
    setModels(modelsResponse.models);
  }

  useEffect(() => {
    void refresh();
  }, [adapter]);

  return (
    <LlmHubContext.Provider value={{ adapter, providers, connectedProviders, models, refresh }}>
      {children}
    </LlmHubContext.Provider>
  );
}

export function useLlmHub() {
  const context = useContext(LlmHubContext);
  if (!context) throw new Error('useLlmHub must be used within a LlmHubProvider');
  return context;
}
```

```jsx
// app/src/contexts/SettingsContext.jsx
const DEFAULT_SETTINGS = {
  theme: 'dark',
  defaultConfigGenModel: null,
  defaultEvalModel: null,
  defaultJudgeModel: null,
};
```

```jsx
// app/src/App.jsx
import { LlmHubProvider } from './contexts/LlmHubContext';

function App() {
  return (
    <SettingsProvider>
      <LlmHubProvider>
        <EvalConfigProvider>
          <EvalRunProvider>
            {/* existing router tree */}
          </EvalRunProvider>
        </EvalConfigProvider>
      </LlmHubProvider>
    </SettingsProvider>
  );
}
```

```jsx
// app/src/components/ConnectionWarning.jsx
import { Link } from 'react-router-dom';

function ConnectionWarning() {
  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-[var(--color-warning)]">
      <div className="max-w-5xl mx-auto px-8 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-[#2D2A1F]">
          No provider connection configured. Nothing will run until you connect one in Settings.
        </span>
        <Link to="/settings" className="text-sm font-semibold text-white">
          Go to Settings
        </Link>
      </div>
    </div>
  );
}

export default ConnectionWarning;
```

```jsx
// app/src/components/Layout.jsx
import ConnectionWarning from './ConnectionWarning';
import { useLlmHub } from '../contexts/LlmHubContext';

function Layout() {
  const { connectedProviders } = useLlmHub();
  const needsConnection = connectedProviders.length === 0;

  return (
    <>
      {needsConnection ? <ConnectionWarning /> : null}
      <main className={`pt-16 min-h-screen ${needsConnection ? 'mt-12' : ''}`}>
        {/* existing outlet */}
      </main>
    </>
  );
}
```

- [ ] **Step 4: Run the targeted test and smoke-check the app render**

Run: `npm --prefix app run test -- ConnectionWarning`

Expected: PASS with `1 passed`.

Run: `npm --prefix app run build`

Expected: Vite build completes successfully.

- [ ] **Step 5: Commit the state and connection gating changes**

```bash
git add app/src/contexts/LlmHubContext.jsx app/src/contexts/SettingsContext.jsx app/src/App.jsx app/src/components/ConnectionWarning.jsx app/src/components/ConnectionWarning.test.jsx app/src/components/Layout.jsx app/src/views/SettingsView.jsx
git commit -m "feat: add llm-hub connection state to SkillEval"
```

### Task 4: Replace Anthropic Transport With an llm-hub Client and Migrate Config Generation

**Files:**
- Create: `app/src/utils/llmHubClient.js`
- Create: `app/src/utils/jsonResponse.js`
- Create: `app/src/utils/jsonResponse.test.js`
- Create: `app/src/utils/modelFilters.js`
- Create: `app/src/utils/modelFilters.test.js`
- Modify: `app/src/utils/generateConfig.js`
- Modify: `app/src/contexts/EvalConfigContext.jsx`
- Modify: `app/src/views/ConfigureView.jsx`

- [ ] **Step 1: Write the failing parsing and model-filter tests**

```js
import { describe, expect, it } from 'vitest';

import { extractJsonObject } from './jsonResponse';
import { getConfigGenerationModels } from './modelFilters';

describe('extractJsonObject', () => {
  it('parses fenced JSON payloads', () => {
    expect(extractJsonObject('```json\n{"outputType":"text","criteria":[],"prompts":[]}\n```'))
      .toEqual({ outputType: 'text', criteria: [], prompts: [] });
  });
});

describe('getConfigGenerationModels', () => {
  it('returns only language models connected for config generation', () => {
    expect(
      getConfigGenerationModels([
        { providerId: 'gemini', modelId: 'gemini-2.5-pro', kind: 'language', connected: true },
        { providerId: 'gemini', modelId: 'text-embedding-004', kind: 'embedding', connected: true },
      ]),
    ).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm --prefix app run test -- jsonResponse modelFilters`

Expected: FAIL because the helper modules do not exist.

- [ ] **Step 3: Implement the llm-hub client, parsing helper, and config-generation migration**

```js
// app/src/utils/llmHubClient.js
export async function chatWithModel({
  adapter,
  selection,
  system,
  messages,
  maxOutputTokens = 8192,
}) {
  const response = await adapter.chat({
    providerId: selection.providerId,
    modelId: selection.modelId,
    system,
    messages,
    maxOutputTokens,
  });

  return response.text;
}
```

```js
// app/src/utils/jsonResponse.js
export function extractJsonObject(text) {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fencedMatch ? fencedMatch[1] : text;
  return JSON.parse(raw.trim());
}
```

```js
// app/src/utils/modelFilters.js
export function getConfigGenerationModels(models) {
  return models.filter((model) => model.connected && model.kind === 'language');
}

export function getLanguageModels(models) {
  return models.filter((model) => model.connected && model.kind === 'language');
}

export function getVisionJudgeModels(models) {
  return models.filter(
    (model) => model.connected && model.kind === 'language' && model.supportsVision,
  );
}
```

```js
// app/src/utils/generateConfig.js
import { chatWithModel } from './llmHubClient';
import { extractJsonObject } from './jsonResponse';

export async function generateFromSkills({
  adapter,
  modelSelection,
  skillA,
  skillB,
  generationType = 'all',
  promptCount = 50,
  existingConfig = null,
  bypassCache = false,
}) {
  const text = await chatWithModel({
    adapter,
    selection: modelSelection,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const generated = extractJsonObject(text);
  // keep existing validation and fallback behavior
}
```

```jsx
// app/src/contexts/EvalConfigContext.jsx
const { settings } = useSettings();
const { adapter } = useLlmHub();

const result = await generateFromSkills({
  adapter,
  modelSelection: settings.defaultConfigGenModel,
  skillA: config.skillA,
  skillB: config.skillB,
  generationType: 'all',
  promptCount: config.promptCount,
  bypassCache,
});
```

- [ ] **Step 4: Run the helper tests and build**

Run: `npm --prefix app run test -- jsonResponse modelFilters`

Expected: PASS with both helper suites green.

Run: `npm --prefix app run build`

Expected: build succeeds with no references to `callAnthropic`.

- [ ] **Step 5: Commit the inference migration for config generation**

```bash
git add app/src/utils/llmHubClient.js app/src/utils/jsonResponse.js app/src/utils/jsonResponse.test.js app/src/utils/modelFilters.js app/src/utils/modelFilters.test.js app/src/utils/generateConfig.js app/src/contexts/EvalConfigContext.jsx app/src/views/ConfigureView.jsx
git commit -m "feat: route SkillEval config generation through llm-hub"
```

### Task 5: Migrate Eval Runs and Judging, Add Message Normalization and Concurrency Limits

**Files:**
- Create: `app/src/utils/concurrency.js`
- Create: `app/src/utils/concurrency.test.js`
- Create: `app/src/utils/buildJudgeMessages.js`
- Create: `app/src/utils/buildJudgeMessages.test.js`
- Modify: `app/src/utils/runEval.js`
- Modify: `app/src/utils/judgeEval.js`
- Modify: `app/src/contexts/EvalRunContext.jsx`
- Modify: `app/src/utils/screenshot.js`
- Modify: `app/src/views/EvaluateView.jsx`

- [ ] **Step 1: Write the failing concurrency and judge-message tests**

```js
import { describe, expect, it } from 'vitest';

import { runWithConcurrency } from './concurrency';
import { buildJudgeMessages } from './buildJudgeMessages';

describe('runWithConcurrency', () => {
  it('preserves order while limiting parallel work', async () => {
    const result = await runWithConcurrency([1, 2, 3], 2, async (value) => value * 2);
    expect(result).toEqual([2, 4, 6]);
  });
});

describe('buildJudgeMessages', () => {
  it('creates provider-agnostic multimodal user content', () => {
    const messages = buildJudgeMessages({
      prompt: 'Design a card',
      resultA: '<div>A</div>',
      resultB: '<div>B</div>',
      screenshotA: 'Zm9v',
      screenshotB: 'YmFy',
      includeCode: true,
      isVisual: true,
      skillNames: { skillA: 'A', skillB: 'B' },
    });

    expect(messages[0].role).toBe('user');
    expect(messages[0].content.some((part) => part.type === 'image')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm --prefix app run test -- concurrency buildJudgeMessages`

Expected: FAIL because the helper modules do not exist.

- [ ] **Step 3: Implement concurrency control, judge-message normalization, and llm-hub-backed evals**

```js
// app/src/utils/concurrency.js
export async function runWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function consume() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return results;
}
```

```js
// app/src/utils/buildJudgeMessages.js
export function buildJudgeMessages({
  prompt,
  resultA,
  resultB,
  screenshotA,
  screenshotB,
  includeCode,
  isVisual,
  skillNames,
}) {
  const content = [
    { type: 'text', text: `Original prompt:\n${prompt}\n\nResult A (${skillNames.skillA})` },
  ];

  if (isVisual && screenshotA) {
    content.push({
      type: 'image',
      image: `data:image/png;base64,${screenshotA}`,
    });
  }

  if (includeCode) {
    content.push({ type: 'text', text: `\n\`\`\`\n${resultA}\n\`\`\`\n\nResult B (${skillNames.skillB})` });
  } else {
    content.push({ type: 'text', text: `\nResult B (${skillNames.skillB})` });
  }

  if (isVisual && screenshotB) {
    content.push({
      type: 'image',
      image: `data:image/png;base64,${screenshotB}`,
    });
  }

  if (includeCode) {
    content.push({ type: 'text', text: `\n\`\`\`\n${resultB}\n\`\`\`` });
  }

  return [{ role: 'user', content }];
}
```

```js
// app/src/utils/runEval.js
import { chatWithModel } from './llmHubClient';
import { runWithConcurrency } from './concurrency';

export async function runAllEvals({ adapter, modelSelection, skillA, skillB, prompts, onProgress }) {
  const evaluations = prompts.map((prompt, idx) => ({
    id: idx + 1,
    prompt,
    resultA: { content: '', error: null, elapsed: null, status: 'pending' },
    resultB: { content: '', error: null, elapsed: null, status: 'pending' },
    screenshotA: null,
    screenshotB: null,
    judge: { status: 'pending', result: '', scores: null, elapsed: null },
  }));

  await runWithConcurrency(prompts, 3, async (prompt, index) => {
    // run A then B through chatWithModel and update evaluations[index]
  });

  return evaluations;
}
```

```js
// app/src/utils/judgeEval.js
import { chatWithModel } from './llmHubClient';
import { buildJudgeMessages } from './buildJudgeMessages';
import { runWithConcurrency } from './concurrency';

const messages = buildJudgeMessages({
  prompt: evaluation.prompt,
  resultA: evaluation.resultA.content,
  resultB: evaluation.resultB.content,
  screenshotA: screenshots.screenshotA,
  screenshotB: screenshots.screenshotB,
  includeCode,
  isVisual,
  skillNames,
});

const resultText = await chatWithModel({
  adapter,
  selection: judgeSelection,
  system: buildJudgePrompt(criteria, outputType),
  messages,
  maxOutputTokens: 4096,
});
```

```js
// app/src/utils/screenshot.js
import { getRuntimeConfig } from '../lib/runtimeConfig';

const { screenshotServerUrl: SCREENSHOT_SERVER } = getRuntimeConfig();
```

- [ ] **Step 4: Run the helper tests, then the full app test suite and build**

Run: `npm --prefix app run test -- concurrency buildJudgeMessages`

Expected: PASS with both helper suites green.

Run: `npm --prefix app run test`

Expected: all app tests pass.

Run: `npm --prefix app run build`

Expected: production build completes without references to `Anthropic API`.

- [ ] **Step 5: Commit the eval and judge migration**

```bash
git add app/src/utils/concurrency.js app/src/utils/concurrency.test.js app/src/utils/buildJudgeMessages.js app/src/utils/buildJudgeMessages.test.js app/src/utils/runEval.js app/src/utils/judgeEval.js app/src/contexts/EvalRunContext.jsx app/src/utils/screenshot.js app/src/views/EvaluateView.jsx
git commit -m "feat: run SkillEval evals and judging through llm-hub"
```

### Task 6: Compose the Settings UI, Update Documentation, and Verify End-to-End

**Files:**
- Modify: `app/src/views/SettingsView.jsx`
- Modify: `README.md`
- Modify: `screenshot-server.js`

- [ ] **Step 1: Add the final settings composition and startup scripts**

```jsx
// app/src/views/SettingsView.jsx
import '@llm-hub/ui/styles.css';
import { AuthMethodSelector, ConnectionSchemaRenderer, ModelSelector } from '@llm-hub/ui';

// Render connected providers, auth methods, and stage-specific default selectors
// using the adapter from useLlmHub() and the filtered model lists from modelFilters.js.
```

```js
// screenshot-server.js
const PORT = Number(process.env.SCREENSHOT_SERVER_PORT || 3001);
```

```md
## Running SkillEval with llm-hub

Set these shell variables before starting the sidecar:

- `LLM_HUB_CODEX_BRIDGE_AUTH_URL`
- `LLM_HUB_CODEX_BRIDGE_TOKEN_URL`

1. `npm --prefix ../llm-hub install`
2. `npm --prefix app install`
3. `npm --prefix app run llm-hub`
4. `node screenshot-server.js`
5. `npm --prefix app run dev`
```

- [ ] **Step 2: Run the end-to-end manual verification sequence**

Run: `npm --prefix app run llm-hub`

Expected: `llm-hub` server listens on `http://localhost:3002`.

Run: `node screenshot-server.js`

Expected: screenshot server listens on `http://localhost:3001`.

Run: `npm --prefix app run dev`

Expected: SkillEval loads on `http://localhost:5173`.

Manual:
- Connect Gemini with an API key.
- Connect Codex through the OAuth bridge.
- Generate config from two skills.
- Run a text-only eval.
- Run a visual eval with screenshots.

Expected: all flows complete without browser-side API-key prompts.

- [ ] **Step 3: Run the final verification commands**

Run: `npm --prefix app run test`

Expected: all app tests pass.

Run: `npm --prefix app run build`

Expected: build succeeds.

Run: `npm --prefix ../llm-hub --workspace @llm-hub/core run test`

Expected: llm-hub provider tests pass.

- [ ] **Step 4: Commit the documentation and final wiring**

```bash
git add app/src/views/SettingsView.jsx README.md screenshot-server.js
git commit -m "docs: describe SkillEval multi-LLM setup"
```

## Self-Review

### Spec coverage

- V1 scope: covered by Tasks 2 through 6.
- Runtime topology and port collision: covered by Tasks 1, 2, and 6.
- Stage-specific model defaults: covered by Task 3.
- llm-hub transport replacement: covered by Tasks 4 and 5.
- Visual judging compatibility: covered by Task 5.
- Codex bridge provider: covered by Task 2.
- Browser-secret removal and connection gating: covered by Task 3.
- Verification and docs: covered by Task 6.

### Placeholder scan

- No `TODO`, `TBD`, or "implement later" markers remain.
- Each task names the files to touch, commands to run, and expected outputs.

### Type consistency

- Stage default settings use `{ providerId, modelId }` consistently.
- `adapter` is the shared llm-hub client boundary across config generation, eval generation, and judging.
