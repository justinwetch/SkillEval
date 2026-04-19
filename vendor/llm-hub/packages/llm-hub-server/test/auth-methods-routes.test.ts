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

  it('returns only the supported Gemini API-key auth method', async () => {
    const { app } = createTestServer();
    const response = await app.request('/providers/gemini/auth-methods');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authMethods).toHaveLength(1);
    expect(body.authMethods[0]).toEqual(
      expect.objectContaining({
        id: 'api_key',
        type: 'api_key',
        uxMode: 'form',
        available: true,
      }),
    );
  });
});
