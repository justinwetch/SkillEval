import { describe, expect, it } from 'vitest';

import { findCatalogModelByFullId } from '../src/models/catalog';
import { seedModels } from '../src/models/seed-models';
import { createInMemoryLlmHubCoreService } from '../src/services/llm-hub-core-service';

describe('model lookup', () => {
  it('filters models by provider', () => {
    const service = createInMemoryLlmHubCoreService();
    const models = service.listModels('openai');

    expect(models.length).toBeGreaterThan(0);
    expect(models.every((model) => model.providerId === 'openai')).toBe(true);
  });

  it('resolves a model by full namespaced id', () => {
    const model = findCatalogModelByFullId(seedModels, 'openai:gpt-4o-mini');

    expect(model?.displayName).toBe('GPT-4o Mini');
  });
});
