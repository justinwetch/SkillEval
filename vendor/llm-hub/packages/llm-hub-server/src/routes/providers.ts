import { Hono } from 'hono';

import type { JSONValue } from '@llm-hub/core';

import { LlmHubServerError } from '../errors';
import { connectRequestSchema, providerUiSchemaQuerySchema } from '../schemas/requests';
import type { LlmHubServerService } from '../lib/llm-hub-server-service';

export function createProvidersRouter(service: LlmHubServerService) {
  const router = new Hono();

  router.get('/', async (c) => {
    const providers = await service.listProviders();
    return c.json({ providers });
  });

  router.get('/connected', async (c) => {
    const providers = await service.listConnectedProviders();
    return c.json({ providers });
  });

  router.get('/:id/auth-methods', async (c) => {
    const authMethods = await service.getProviderAuthMethods(c.req.param('id'));
    return c.json({ providerId: c.req.param('id'), authMethods });
  });

  router.get('/:id/ui-schema', async (c) => {
    const query = providerUiSchemaQuerySchema.parse(c.req.query());
    const uiSchema = await service.getProviderUISchema(
      c.req.param('id'),
      query.method,
      query.hostMode ?? 'full_settings_page',
    );
    return c.json(uiSchema);
  });

  router.post('/:id/connect', async (c) => {
    const body = connectRequestSchema.parse(await c.req.json());
    try {
      const result = await service.connectProvider({
        providerId: c.req.param('id'),
        methodId: body.method,
        payload: body.payload as Record<string, JSONValue>,
        defaultModelId: body.defaultModelId,
      });

      return c.json(result, result.state === 'oauth_pending' ? 202 : 200);
    } catch (error) {
      if (error instanceof LlmHubServerError && error.code === 'VALIDATION_ERROR') {
        const details = error.details as { validation?: { fieldErrors: Record<string, string> } } | undefined;
        const uiSchema = await service.getProviderUISchema(
          c.req.param('id'),
          body.method,
          'full_settings_page',
          details?.validation?.fieldErrors ?? {},
        );
        throw new LlmHubServerError(error.statusCode, error.code, error.message, {
          ...error.details,
          uiSchema,
        });
      }

      throw error;
    }
  });

  router.post('/:id/disconnect', async (c) => {
    const provider = await service.disconnectProvider(c.req.param('id'));
    return c.json({ ok: true, provider });
  });

  router.post('/:id/test', async (c) => {
    const result = await service.testProvider(c.req.param('id'));
    return c.json(result, result.result.ok ? 200 : 502);
  });

  return router;
}
