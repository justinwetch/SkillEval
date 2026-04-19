import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
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

vi.mock('@ai-sdk/openai-compatible', () => ({
  createOpenAICompatible: vi.fn(() => ({
    languageModel: vi.fn(),
    textEmbeddingModel: vi.fn(),
    imageModel: vi.fn(),
  })),
}));

const createOpenAIMock = vi.mocked(createOpenAI);
const createOpenAICompatibleMock = vi.mocked(createOpenAICompatible);

function credentialRecord(
  apiKey: string,
  providerId = 'codex-bridge',
  authMethodId = 'oauth_pkce',
): CredentialRecord {
  return {
    id: 'credential-test',
    providerId,
    authMethodId,
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
    createOpenAICompatibleMock.mockClear();
  });

  it('builds Codex bridge providers from the stored OAuth apiKey secret', () => {
    const provider = buildSdkProvider('codex-bridge', credentialRecord('codex-api-key'));

    expect(provider).toBeDefined();
    expect(createOpenAIMock).toHaveBeenCalledWith({ apiKey: 'codex-api-key' });
  });

  it('builds GitHub Models providers with the GitHub inference endpoint', () => {
    const provider = buildSdkProvider(
      'github-models',
      credentialRecord('github-token', 'github-models', 'github_token'),
    );

    expect(provider).toBeDefined();
    expect(createOpenAICompatibleMock).toHaveBeenCalledWith({
      name: 'githubModels',
      apiKey: 'github-token',
      baseURL: 'https://models.github.ai/inference',
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
      },
      supportsStructuredOutputs: true,
    });
  });
});
