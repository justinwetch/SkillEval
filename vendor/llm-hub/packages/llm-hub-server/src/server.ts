import { serve } from '@hono/node-server';

import { createLlmHubServerApp } from './app';

const port = Number(process.env.LLM_HUB_SERVER_PORT ?? '3001');
const baseDir = process.env.LLM_HUB_SERVER_BASE_DIR || process.cwd();
const publicBaseUrl = process.env.LLM_HUB_SERVER_PUBLIC_BASE_URL;

const { app } = createLlmHubServerApp({
  baseDir,
  publicBaseUrl,
});

serve({
  fetch: app.fetch,
  port,
});
