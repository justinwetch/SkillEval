import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createProviderRegistry } from 'ai';
import { createOllama } from 'ollama-ai-provider-v2';

import { ProviderNotFoundError, SecretAccessError } from '../errors';
import type { CredentialRecord } from '../types';

export type AiRegistryProvider = Parameters<typeof createProviderRegistry>[0][string];
export type AiLanguageModel = ReturnType<
  ReturnType<typeof createProviderRegistry>['languageModel']
>;

function getRequiredSecret(record: CredentialRecord, key: string): string {
  const value = record.secrets[key];

  if (!value) {
    throw new SecretAccessError(
      `Credential record ${record.id} is missing required secret \"${key}\".`,
    );
  }

  return value;
}

function getStringValue(record: CredentialRecord, key: string): string | undefined {
  const value = record.values[key];
  return typeof value === 'string' ? value : undefined;
}

function getHeaders(record: CredentialRecord): Record<string, string> | undefined {
  const headers = record.values.headers;

  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
    return undefined;
  }

  return Object.entries(headers).reduce<Record<string, string>>(
    (accumulator, [key, value]) => {
      accumulator[key] = String(value);
      return accumulator;
    },
    {},
  );
}

export function buildSdkProvider(
  providerId: string,
  credential: CredentialRecord,
): AiRegistryProvider {
  switch (providerId) {
    case 'openai':
      return createOpenAI({ apiKey: getRequiredSecret(credential, 'apiKey') }) as AiRegistryProvider;
    case 'codex-bridge':
      return createOpenAI({ apiKey: getRequiredSecret(credential, 'apiKey') }) as AiRegistryProvider;
    case 'anthropic':
      return createAnthropic({ apiKey: getRequiredSecret(credential, 'apiKey') }) as AiRegistryProvider;
    case 'gemini':
      return createGoogleGenerativeAI({ apiKey: getRequiredSecret(credential, 'apiKey') }) as AiRegistryProvider;
    case 'openrouter':
      return createOpenAICompatible({
        name: 'openrouter',
        apiKey: getRequiredSecret(credential, 'apiKey'),
        baseURL: 'https://openrouter.ai/api/v1',
        headers: getHeaders(credential),
        supportsStructuredOutputs: true,
      }) as AiRegistryProvider;
    case 'ollama':
      return createOllama({
        baseURL: getStringValue(credential, 'baseURL') ?? 'http://localhost:11434/api',
        headers: getHeaders(credential),
      }) as AiRegistryProvider;
    case 'custom-openai-compatible':
      return createOpenAICompatible({
        name: 'customOpenAICompatible',
        apiKey: getRequiredSecret(credential, 'apiKey'),
        baseURL: getStringValue(credential, 'baseURL') ?? 'https://api.example.com/v1',
        headers: getHeaders(credential),
        supportsStructuredOutputs: true,
      }) as AiRegistryProvider;
    default:
      throw new ProviderNotFoundError(providerId);
  }
}
