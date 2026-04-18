import { describe, expect, it } from 'vitest';

import { createTestServer } from './test-helpers';

describe('/providers/:id/auth-methods', () => {
  it('returns reusable auth method metadata and schema summaries', async () => {
    const { app } = createTestServer();
    const response = await app.request('/providers/openrouter/auth-methods');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authMethods).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'api_key',
          type: 'api_key',
          uxMode: 'form',
          schemaSummary: expect.any(Object),
        }),
        expect.objectContaining({
          id: 'oauth_pkce',
          type: 'oauth_pkce',
          uxMode: 'oauth_redirect',
          available: true,
          ctaMetadata: expect.objectContaining({
            buttonLabel: 'Connect with OpenRouter',
          }),
        }),
      ]),
    );
  });

  it('surfaces the unofficial Google OAuth placeholder through the same contract', async () => {
    const { app } = createTestServer();
    const response = await app.request('/providers/gemini/auth-methods');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authMethods).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'oauth_unofficial',
          uxMode: 'oauth_redirect',
          experimental: true,
          available: false,
          availabilityMessage: expect.stringMatching(/not implemented/i),
        }),
      ]),
    );
  });
});
