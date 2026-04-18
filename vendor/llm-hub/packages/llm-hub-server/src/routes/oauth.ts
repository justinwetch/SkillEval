import { Hono } from 'hono';

import { renderOauthCallbackPage } from '../lib/html';
import type { LlmHubServerService } from '../lib/llm-hub-server-service';
import { oauthCallbackQuerySchema, oauthStartQuerySchema } from '../schemas/requests';

export function createOauthRouter(service: LlmHubServerService) {
  const router = new Hono();

  router.get('/:provider/start', async (c) => {
    const query = oauthStartQuerySchema.parse(c.req.query());
    const callbackUrl =
      query.callbackUrl ?? service.resolveCallbackUrl(c.req.param('provider'), new URL(c.req.url).origin);
    const result = await service.startOAuth(c.req.param('provider'), callbackUrl);

    if (query.redirect === 'true' && result.launchUrl) {
      return c.redirect(result.launchUrl);
    }

    return c.json({
      ...result,
      callbackUrl,
    });
  });

  router.get('/:provider/callback', async (c) => {
    const query = oauthCallbackQuerySchema.parse(c.req.query());
    const result = await service.completeOAuth(c.req.param('provider'), query);

    if (query.format === 'html') {
      return c.html(renderOauthCallbackPage(result));
    }

    return c.json(result);
  });

  return router;
}
