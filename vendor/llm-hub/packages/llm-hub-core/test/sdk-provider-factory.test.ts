import { createOpenAI } from '@ai-sdk/openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSdkProvider } from '../src/registry/sdk-provider-factory';
import type { CredentialRecord } from '../src/types';

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({
    languageModel: vi.fn(),
    textEmbeddingModel: vi.fn(),
    imageModel: vi.fn(),
  })),
}));

const createOpenAIMock = vi.mocked(createOpenAI);

function credentialRecord(apiKey: string): CredentialRecord {
  return {
    id: 'credential-test',
    providerId: 'codex-bridge',
    authMethodId: 'oauth_pkce',
    label: 'Codex Bridge',
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-18T00:00:00.000Z',
    secrets: { apiKey },
    values: {},
  };
}

describe('sdk provider factory', () => {
  beforeEach(() => {
    createOpenAIMock.mockClear();
  });

  it('builds Codex bridge providers from the stored OAuth apiKey secret', () => {
    const provider = buildSdkProvider('codex-bridge', credentialRecord('codex-api-key'));

    expect(provider).toBeDefined();
    expect(createOpenAIMock).toHaveBeenCalledWith({ apiKey: 'codex-api-key' });
  });
});
