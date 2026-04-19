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
    const geminiModels = service
      .listModels('gemini')
      .map((model) => model.modelId);
    const githubModelsMethods = service
      .getAuthMethods('github-models')
      .map((method) => method.id);
    const githubModels = service
      .listModels('github-models')
      .map((model) => model.modelId);
    const deepInfraMethods = service
      .getAuthMethods('deepinfra')
      .map((method) => method.id);
    const deepInfraModels = service
      .listModels('deepinfra')
      .map((model) => model.modelId);

    expect(providerIds).toEqual(
      expect.arrayContaining([
        'openai',
        'codex-bridge',
        'anthropic',
        'gemini',
        'github-models',
        'deepinfra',
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
      expect.arrayContaining([
        'gpt-5',
        'gpt-5-mini',
        'gpt-5-codex',
        'gpt-5.1-codex',
        'gpt-5.1-codex-mini',
        'gpt-5.1-codex-max',
        'gpt-5.2-codex',
      ]),
    );
    expect(geminiModels).toEqual(
      expect.arrayContaining([
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-3-flash-preview',
        'gemini-3-pro-preview',
        'gemini-3.1-pro-preview',
        'gemini-3.1-flash-lite-preview',
      ]),
    );
    expect(githubModelsMethods).toEqual(expect.arrayContaining(['github_token']));
    expect(githubModels).toEqual(
      expect.arrayContaining([
        'openai/gpt-5.2-codex',
        'openai/gpt-5.4',
        'anthropic/claude-sonnet-4.5',
      ]),
    );
    expect(deepInfraMethods).toEqual(expect.arrayContaining(['api_key']));
    expect(deepInfraModels).toEqual(
      expect.arrayContaining([
        'zai-org/GLM-5.1',
        'anthropic/claude-4-sonnet',
        'anthropic/claude-4-opus',
        'Qwen/Qwen3.5-397B-A17B',
        'deepseek-ai/DeepSeek-V3',
      ]),
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
