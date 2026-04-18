import { describe, expect, it } from 'vitest';

import { createInMemoryLlmHubCoreService } from '../src/services/llm-hub-core-service';
import { evaluateVisibilityRule } from '../src/ui/visibility';

describe('conditional fields', () => {
  it('attaches auth-method visibility rules to OpenRouter sections and actions', async () => {
    const service = createInMemoryLlmHubCoreService();
    const schema = await service.getProviderUISchema('openrouter');

    const apiKeySection = schema.sections.find((section) => section.id === 'api-key');
    const oauthSection = schema.sections.find((section) => section.id === 'oauth-pkce');
    const oauthAction = schema.actions.find((action) => action.kind === 'oauth_launch');

    expect(apiKeySection?.visibility?.[0]).toBeDefined();
    expect(oauthSection?.visibility?.[0]).toBeDefined();
    expect(oauthAction?.visibility?.[0]).toBeDefined();

    expect(
      evaluateVisibilityRule(apiKeySection!.visibility![0], {
        selectedAuthMethodId: 'api_key',
      }),
    ).toBe(true);
    expect(
      evaluateVisibilityRule(oauthSection!.visibility![0], {
        selectedAuthMethodId: 'oauth_pkce',
      }),
    ).toBe(true);
    expect(
      evaluateVisibilityRule(oauthAction!.visibility![0], {
        selectedAuthMethodId: 'oauth_pkce',
      }),
    ).toBe(true);
  });
});
