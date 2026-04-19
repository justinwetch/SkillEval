import { describe, expect, it, vi } from 'vitest';

import { createTestServer } from './test-helpers';

describe('Codex CLI chat provider', () => {
  it('routes chat requests through the Codex CLI runner', async () => {
    const codexCliRunner = vi.fn(async () => ({
      text: '<main>generated frontend</main>',
      warnings: ['Codex CLI output is captured from the local process.'],
    }));
    const { app } = createTestServer({ codexCliRunner });

    await app.request('/providers/codex-cli/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'existing_chatgpt_login',
        payload: {},
        defaultModelId: 'gpt-5.3-codex',
      }),
    });

    const response = await app.request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: 'codex-cli',
        modelId: 'gpt-5.3-codex',
        system: 'Use the provided frontend skill.',
        messages: [{ role: 'user', content: 'Build a pricing page.' }],
      }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.text).toBe('<main>generated frontend</main>');
    expect(codexCliRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'gpt-5.3-codex',
        system: 'Use the provided frontend skill.',
        messages: [{ role: 'user', content: 'Build a pricing page.' }],
      }),
    );
  });
});
