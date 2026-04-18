import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { normalizeServerError } from './errors';
import { LlmHubServerService, type LlmHubServerServiceOptions } from './lib/llm-hub-server-service';
import { createInferenceRouter } from './routes/inference';
import { createModelsRouter } from './routes/models';
import { createOauthRouter } from './routes/oauth';
import { createProvidersRouter } from './routes/providers';

export interface CreateLlmHubServerAppResult {
  app: Hono;
  service: LlmHubServerService;
}

export function createLlmHubServerApp(
  options: LlmHubServerServiceOptions = {},
): CreateLlmHubServerAppResult {
  const service = new LlmHubServerService(options);
  const app = new Hono();

  app.use('*', cors());

  app.onError((error, c) => {
    const normalized = normalizeServerError(error);
    const body = {
      ok: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
      },
    };

    return new Response(JSON.stringify(body), {
      status: normalized.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  app.get('/', (c) =>
    c.json({
      name: '@llm-hub/server',
      status: 'ok',
    }),
  );

  app.get('/health', (c) =>
    c.json({
      name: '@llm-hub/server',
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
  );

  app.route('/providers', createProvidersRouter(service));
  app.route('/', createModelsRouter(service));
  app.route('/oauth', createOauthRouter(service));
  app.route('/', createInferenceRouter(service));

  app.notFound((c) =>
    c.json(
      {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found.',
        },
      },
      404,
    ),
  );

  return { app, service };
}
