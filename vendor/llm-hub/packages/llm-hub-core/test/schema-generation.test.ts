import { describe, expect, it } from 'vitest';

import { createInMemoryLlmHubCoreService } from '../src/services/llm-hub-core-service';

describe('schema generation', () => {
  it('builds the custom OpenAI-compatible UI schema', async () => {
    const service = createInMemoryLlmHubCoreService();
    const schema = await service.getProviderUISchema(
      'custom-openai-compatible',
      'openai_compatible',
    );

    const fieldKeys = schema.sections.flatMap((section) =>
      section.fields.map((field) => field.key),
    );
    const actionKinds = schema.actions.map((action) => action.kind);

    expect(fieldKeys).toContain('baseURL');
    expect(fieldKeys).toContain('apiKey');
    expect(fieldKeys).toContain('headersJson');
    expect(fieldKeys).toContain('modelPrefix');
    expect(actionKinds).toContain('test_connection');
  });
});
