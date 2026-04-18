import { describe, expect, it } from 'vitest';

import { createInMemoryLlmHubCoreService } from '../src/services/llm-hub-core-service';

describe('provider lookup', () => {
  it('lists seed providers and auth methods', () => {
    const service = createInMemoryLlmHubCoreService();
    const providers = service.listProviders();
    const providerIds = providers.map((provider) => provider.id);
    const openRouterMethods = service
      .getAuthMethods('openrouter')
      .map((method) => method.id);

    expect(providerIds).toEqual(
      expect.arrayContaining([
        'openai',
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
  });
});
