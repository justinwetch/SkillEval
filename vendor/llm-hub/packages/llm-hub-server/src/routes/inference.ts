import { Hono } from 'hono';

import { chatRequestSchema, embedRequestSchema } from '../schemas/requests';
import type { LlmHubServerService } from '../lib/llm-hub-server-service';

export function createInferenceRouter(service: LlmHubServerService) {
  const router = new Hono();

  router.post('/chat', async (c) => {
    const body = chatRequestSchema.parse(await c.req.json());
    return c.json(await service.chat(body));
  });

  router.post('/embed', async (c) => {
    const body = embedRequestSchema.parse(await c.req.json());
    return c.json(await service.embed(body));
  });

  return router;
}
