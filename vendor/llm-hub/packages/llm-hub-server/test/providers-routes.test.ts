import { describe, expect, it } from 'vitest';

import { createTestServer } from './test-helpers';

describe('/providers', () => {
  it('lists provider cards with contract fields', async () => {
    const { app } = createTestServer();
    const response = await app.request('/providers');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.providers.length).toBeGreaterThan(0);
    expect(body.providers[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      category: expect.any(String),
      connected: expect.any(Boolean),
      default: expect.any(Boolean),
      availableAuthMethods: expect.any(Array),
      capabilities: expect.any(Array),
      warningBadges: expect.any(Array),
      experimental: expect.any(Boolean),
      uiHints: expect.any(Object),
    });
  });
});
