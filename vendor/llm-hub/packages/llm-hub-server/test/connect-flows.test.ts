import { describe, expect, it } from 'vitest';

import { createTestServer } from './test-helpers';

describe('connect flows', () => {
  it('keeps secrets masked in connected provider responses', async () => {
    const { app } = createTestServer();

    await app.request('/providers/openrouter/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'api_key',
        payload: { apiKey: 'or-secret-1234567890' },
      }),
    });

    const response = await app.request('/providers/connected');
    const body = await response.json();
    const provider = body.providers.find((item: { id: string }) => item.id === 'openrouter');

    expect(provider.connection.secretMasks[0].maskedValue).not.toContain('or-secret-1234567890');
    expect(provider.connection.secretMasks[0].lastFour).toBe('7890');
  });

  it('supports OpenRouter API-key connect flow', async () => {
    const { app } = createTestServer();
    const response = await app.request('/providers/openrouter/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'api_key',
        payload: { apiKey: 'or-secret-1234567890' },
        defaultModelId: 'openai/gpt-5-mini',
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.state).toBe('connected');
    expect(body.provider.id).toBe('openrouter');
    expect(body.provider.connected).toBe(true);
    expect(body.provider.connection.selectedModelId).toBe('openai/gpt-5-mini');
  });

  it('supports custom OpenAI-compatible connect flow', async () => {
    const { app } = createTestServer();
    const response = await app.request('/providers/custom-openai-compatible/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'openai_compatible',
        payload: {
          baseURL: 'https://example.com/v1',
          apiKey: 'sk-custom-1234567890',
          headersJson: '{"x-tenant":"demo"}',
          modelPrefix: 'tenant-a/',
        },
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.provider.id).toBe('custom-openai-compatible');
    expect(body.provider.connected).toBe(true);
    expect(body.provider.connection.secretMasks[0].lastFour).toBe('7890');
  });
});
