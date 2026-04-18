import { Hono } from 'hono';

import { defaultModelRequestSchema, modelsQuerySchema } from '../schemas/requests';
import type { LlmHubServerService } from '../lib/llm-hub-server-service';

export function createModelsRouter(service: LlmHubServerService) {
  const router = new Hono();

  router.get('/models', async (c) => {
    const query = modelsQuerySchema.parse(c.req.query());
    return c.json(await service.listModels(query.providerId));
  });

  router.post('/default-model', async (c) => {
    const body = defaultModelRequestSchema.parse(await c.req.json());
    const defaultModel = await service.setDefaultModel(body.providerId, body.modelId);
    return c.json({ defaultModel });
  });

  return router;
}
