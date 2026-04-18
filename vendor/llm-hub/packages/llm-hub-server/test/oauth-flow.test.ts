import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTestServer } from './test-helpers';

describe('OpenRouter PKCE lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates and clears OAuth state during start/callback flow', async () => {
    const { app, credentialStore } = createTestServer();
    const startResponse = await app.request('/oauth/openrouter/start');
    const startBody = await startResponse.json();
    const configAfterStart = await credentialStore.getConfig();

    expect(startResponse.status).toBe(200);
    expect(startBody.state).toBe('oauth_pending');
    expect(startBody.launchUrl).toContain('openrouter.ai/auth');
    expect(configAfterStart.oauthSessions).toHaveLength(1);

    const session = configAfterStart.oauthSessions[0];

    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ key: 'or-pkce-1234567890' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const callbackResponse = await app.request(
      `/oauth/openrouter/callback?format=json&code=oauth-code&state=${session.state}`,
    );
    const callbackBody = await callbackResponse.json();
    const configAfterCallback = await credentialStore.getConfig();

    expect(callbackResponse.status).toBe(200);
    expect(callbackBody.state).toBe('connected');
    expect(callbackBody.provider.id).toBe('openrouter');
    expect(callbackBody.provider.connection.secretMasks[0].lastFour).toBe('7890');
    expect(configAfterCallback.oauthSessions).toHaveLength(0);
  });
});
