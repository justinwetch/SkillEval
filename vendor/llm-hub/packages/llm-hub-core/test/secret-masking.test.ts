import { describe, expect, it } from 'vitest';

import { MemoryCredentialStore } from '../src/credentials/credential-store';
import { maskSecret } from '../src/credentials/masking';

describe('secret masking', () => {
  it('masks sensitive values', () => {
    const masked = maskSecret('sk-secret-1234567890', 'apiKey');

    expect(masked.maskedValue).not.toContain('secret-1234567890');
    expect(masked.lastFour).toBe('7890');
  });

  it('never returns raw secrets from public store getters', async () => {
    const store = new MemoryCredentialStore();

    await store.setCredentialRecord({
      id: 'credential-1',
      providerId: 'openai',
      authMethodId: 'api_key',
      label: 'OpenAI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      secrets: { apiKey: 'sk-secret-1234567890' },
      values: {},
    });

    const publicCredential = await store.getPublicCredential('credential-1');

    expect(publicCredential?.secrets.apiKey).not.toBe('sk-secret-1234567890');
    expect(publicCredential?.secretMasks[0]?.lastFour).toBe('7890');
  });
});
