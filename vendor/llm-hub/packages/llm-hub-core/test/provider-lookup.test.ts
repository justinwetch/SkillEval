import { afterEach, describe, expect, it, vi } from 'vitest';

import { createInMemoryLlmHubCoreService } from '../src/services/llm-hub-core-service';

describe('provider lookup', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lists seed providers and auth methods', () => {
    const service = createInMemoryLlmHubCoreService();
    const providers = service.listProviders();
    const providerIds = providers.map((provider) => provider.id);
    const openRouterMethods = service
      .getAuthMethods('openrouter')
      .map((method) => method.id);
    const codexBridgeMethods = service
      .getAuthMethods('codex-bridge')
      .map((method) => method.id);
    const codexBridgeModels = service
      .listModels('codex-bridge')
      .map((model) => model.modelId);

    expect(providerIds).toEqual(
      expect.arrayContaining([
        'openai',
        'codex-bridge',
        'anthropic',
        'gemini',
        'openrouter',
        'ollama',
        'custom-openai-compatible',
      ]),
    );
    expect(openRouterMethods).toEqual(
      expect.arrayContaining(['api_key', 'oauth_pkce']),
    );
    expect(codexBridgeMethods).toEqual(expect.arrayContaining(['oauth_pkce']));
    expect(codexBridgeModels).toEqual(
      expect.arrayContaining(['gpt-5', 'gpt-5-mini']),
    );
  });

  it('loads Codex bridge OAuth endpoints from environment', async () => {
    vi.resetModules();
    vi.stubEnv('LLM_HUB_CODEX_BRIDGE_AUTH_URL', 'https://bridge.example/auth');
    vi.stubEnv('LLM_HUB_CODEX_BRIDGE_TOKEN_URL', 'https://bridge.example/token');

    const { createInMemoryLlmHubCoreService: createService } = await import(
      '../src/services/llm-hub-core-service'
    );
    const service = createService();
    const [codexMethod] = service.getAuthMethods('codex-bridge');

    expect(codexMethod.oauth?.authorizationUrl).toBe('https://bridge.example/auth');
    expect(codexMethod.oauth?.tokenExchangeUrl).toBe('https://bridge.example/token');
  });
});
