import { DEFAULT_FEATURE_FLAGS } from '../constants/feature-flags';
import { AuthMethodNotFoundError, ProviderNotConnectedError } from '../errors';
import { listCatalogModels } from '../models/catalog';
import { seedModels } from '../models/seed-models';
import { createProviderAuthHandler } from '../auth/handlers';
import { FileJsonCredentialStore, MemoryCredentialStore, type CredentialStore } from '../credentials/credential-store';
import { createProviderIndex, type ProviderMethodDefinition, type RegisteredProviderDefinition } from '../providers/definitions';
import { seedProviders } from '../providers/seed-providers';
import { LlmHubProviderRegistry } from '../registry/provider-registry';
import { buildProviderUISchema } from '../ui/schema-builder';
import { nowIso } from '../utils/time';
import type {
  ConnectResult,
  CredentialRecord,
  JSONValue,
  ModelDefinition,
  ProviderAuthMethod,
  ProviderConnection,
  ProviderDefinition,
  ProviderUISchema,
  TestConnectionResult,
} from '../types';
import { createRandomId } from '../utils/pkce';

export interface LlmHubCoreServiceOptions {
  baseDir?: string;
  store?: CredentialStore;
  providers?: RegisteredProviderDefinition[];
  models?: ModelDefinition[];
}

export class LlmHubCoreService {
  private readonly store: CredentialStore;
  private readonly providerRegistry: LlmHubProviderRegistry;
  private readonly providerIndex: Map<string, RegisteredProviderDefinition>;

  constructor(options: LlmHubCoreServiceOptions = {}) {
    this.store =
      options.store ??
      new FileJsonCredentialStore(options.baseDir ?? process.cwd());
    this.providerRegistry = new LlmHubProviderRegistry(
      options.providers ?? seedProviders,
      options.models ?? seedModels,
    );
    this.providerIndex = createProviderIndex(options.providers ?? seedProviders);
  }

  listProviders(): ProviderDefinition[] {
    return this.providerRegistry.listProviders();
  }

  async listConnectedProviders(): Promise<ProviderConnection[]> {
    return (await this.store.getConfig()).connections;
  }

  listModels(providerId?: string): ModelDefinition[] {
    return listCatalogModels(seedModels, providerId);
  }

  getAuthMethods(providerId: string): ProviderAuthMethod[] {
    const provider = this.requireProvider(providerId);
    return provider.provider.authMethods;
  }

  async getProviderUISchema(
    providerId: string,
    methodId?: string,
  ): Promise<ProviderUISchema> {
    const config = await this.store.getConfig();
    const provider = this.requireProvider(providerId);
    const connection = config.connections.find((item) => item.providerId === providerId);

    return buildProviderUISchema({
      provider,
      models: this.providerRegistry.listModels(providerId),
      featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...config.featureFlags },
      selectedAuthMethodId: methodId ?? connection?.authMethodId ?? provider.provider.defaultAuthMethodId,
      status: connection?.status ?? 'disconnected',
    });
  }

  async connect(
    providerId: string,
    methodId: string,
    payload: Record<string, JSONValue>,
  ): Promise<ConnectResult> {
    const provider = this.requireProvider(providerId);
    const config = await this.store.getConfig();
    const authHandler = createProviderAuthHandler({
      provider,
      store: this.store,
      featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...config.featureFlags },
    });
    const beginResult = await authHandler.beginAuth(methodId, payload);

    if (beginResult.kind === 'oauth_pending') {
      return {
        kind: 'oauth_pending',
        providerId,
        authMethodId: methodId,
        launchUrl: beginResult.launchUrl,
        expiresAt: beginResult.expiresAt,
      };
    }

    if (!beginResult.validation.valid) {
      return {
        kind: 'validation_error',
        providerId,
        authMethodId: methodId,
        validation: beginResult.validation,
      };
    }

    const methodDefinition = this.getMethodDefinition(providerId, methodId);
    const credentialRecord = this.buildCredentialRecord(
      provider.provider.displayName,
      providerId,
      methodDefinition,
      beginResult.normalizedPayload,
    );
    await this.store.setCredentialRecord(credentialRecord);

    const connection = this.buildConnection(provider.provider, methodId, credentialRecord.id);
    await this.upsertConnection(connection);

    return {
      kind: 'connected',
      providerId,
      authMethodId: methodId,
      connection,
      validation: beginResult.validation,
    };
  }

  async completeOAuth(
    providerId: string,
    callbackQuery: Record<string, string>,
  ): Promise<ConnectResult> {
    const provider = this.requireProvider(providerId);
    const config = await this.store.getConfig();
    const authHandler = createProviderAuthHandler({
      provider,
      store: this.store,
      featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...config.featureFlags },
    });
    const completeResult = await authHandler.completeAuth(callbackQuery);

    if (!completeResult.validation.valid) {
      return {
        kind: 'validation_error',
        providerId,
        authMethodId: completeResult.authMethodId,
        validation: completeResult.validation,
      };
    }

    const methodDefinition = this.getMethodDefinition(providerId, completeResult.authMethodId);
    const credentialRecord = this.buildCredentialRecord(
      provider.provider.displayName,
      providerId,
      methodDefinition,
      completeResult.normalizedPayload,
    );
    await this.store.setCredentialRecord(credentialRecord);

    const connection = this.buildConnection(
      provider.provider,
      completeResult.authMethodId,
      credentialRecord.id,
    );
    await this.upsertConnection(connection);

    return {
      kind: 'connected',
      providerId,
      authMethodId: completeResult.authMethodId,
      connection,
      validation: completeResult.validation,
    };
  }

  async disconnect(providerId: string): Promise<void> {
    const config = await this.store.getConfig();
    const connection = config.connections.find((item) => item.providerId === providerId);

    if (!connection) {
      return;
    }

    const provider = this.requireProvider(providerId);
    const authHandler = createProviderAuthHandler({
      provider,
      store: this.store,
      featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...config.featureFlags },
    });

    await authHandler.disconnect(connection);

    if (connection.credentialId) {
      await this.store.deleteCredentialRecord(connection.credentialId);
    }

    config.connections = config.connections.filter((item) => item.providerId !== providerId);
    config.oauthSessions = config.oauthSessions.filter((item) => item.providerId !== providerId);
    await this.store.saveConfig(config);
  }

  async testConnection(providerId: string): Promise<TestConnectionResult> {
    const config = await this.store.getConfig();
    const connection = config.connections.find((item) => item.providerId === providerId);

    if (!connection || !connection.credentialId) {
      throw new ProviderNotConnectedError(providerId);
    }

    const credential = await this.store.getCredentialRecordUnsafe(connection.credentialId);

    if (!credential) {
      throw new ProviderNotConnectedError(providerId);
    }

    const provider = this.requireProvider(providerId);
    const authHandler = createProviderAuthHandler({
      provider,
      store: this.store,
      featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...config.featureFlags },
    });
    const validation = await authHandler.validateCredentials(connection.authMethodId, {
      ...credential.values,
      ...credential.secrets,
    });

    if (!validation.valid) {
      return {
        ok: false,
        providerId,
        message: validation.message ?? 'Credential validation failed.',
        validation,
      };
    }

    try {
      const response = await this.runRemoteTest(providerId, credential);

      if (!response) {
        return {
          ok: true,
          providerId,
          message: 'Credentials validated locally. No remote probe configured for this provider.',
          validation,
        };
      }

      return {
        ok: response.ok,
        providerId,
        message: response.ok
          ? 'Remote connection test succeeded.'
          : `Remote connection test failed with status ${response.status}.`,
        validation,
      };
    } catch (error) {
      return {
        ok: false,
        providerId,
        message:
          error instanceof Error ? error.message : 'Remote connection test failed.',
        validation,
      };
    }
  }

  async getLanguageModel(providerId: string, modelId: string) {
    const config = await this.store.getConfig();
    const credentials = await this.store.listCredentialRecordsUnsafe();

    return this.providerRegistry.getLanguageModel({
      providerId,
      modelId,
      connections: config.connections,
      credentials,
    });
  }

  private requireProvider(providerId: string): RegisteredProviderDefinition {
    const provider = this.providerIndex.get(providerId);

    if (!provider) {
      throw new AuthMethodNotFoundError(providerId, 'provider');
    }

    return provider;
  }

  private getMethodDefinition(
    providerId: string,
    methodId: string,
  ): ProviderMethodDefinition {
    const provider = this.requireProvider(providerId);
    const methodDefinition = provider.methods[methodId];

    if (!methodDefinition) {
      throw new AuthMethodNotFoundError(providerId, methodId);
    }

    return methodDefinition;
  }

  private buildCredentialRecord(
    providerName: string,
    providerId: string,
    methodDefinition: ProviderMethodDefinition,
    payload: Record<string, JSONValue>,
  ): CredentialRecord {
    const secrets: Record<string, string> = {};
    const values: Record<string, JSONValue> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (methodDefinition.secretFieldKeys.includes(key) && typeof value === 'string') {
        secrets[key] = value;
      } else {
        values[key] = value;
      }
    }

    const now = nowIso();

    return {
      id: createRandomId(10),
      providerId,
      authMethodId: methodDefinition.method.id,
      label: `${providerName} (${methodDefinition.method.label})`,
      createdAt: now,
      updatedAt: now,
      secrets,
      values,
    };
  }

  private buildConnection(
    provider: ProviderDefinition,
    authMethodId: string,
    credentialId: string,
  ): ProviderConnection {
    const models = this.providerRegistry.listModels(provider.id);
    const defaultModel = models.find((model) => model.kind === 'language');
    const now = nowIso();

    return {
      providerId: provider.id,
      providerName: provider.displayName,
      authMethodId,
      status: 'connected',
      credentialId,
      connectedAt: now,
      updatedAt: now,
      availableModelIds: models.map((model) => model.modelId),
      selectedModelId: defaultModel?.modelId,
      warnings: [...provider.warnings],
      capabilities: [...provider.capabilities],
      isExperimental: Boolean(provider.experimental),
    };
  }

  private async upsertConnection(connection: ProviderConnection): Promise<void> {
    const config = await this.store.getConfig();
    config.connections = config.connections.filter(
      (item) => item.providerId !== connection.providerId,
    );
    config.connections.push(connection);
    await this.store.saveConfig(config);
  }

  private async runRemoteTest(
    providerId: string,
    credential: CredentialRecord,
  ): Promise<Response | undefined> {
    switch (providerId) {
      case 'openai':
        return fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${credential.secrets.apiKey}` },
        });
      case 'gemini':
        return fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${credential.secrets.apiKey}`,
        );
      case 'openrouter':
        return fetch('https://openrouter.ai/api/v1/models', {
          headers: { Authorization: `Bearer ${credential.secrets.apiKey}` },
        });
      case 'github-models':
        return fetch('https://models.github.ai/catalog/models', {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${credential.secrets.apiKey}`,
            'X-GitHub-Api-Version': '2026-03-10',
          },
        });
      case 'deepinfra':
        return fetch('https://api.deepinfra.com/v1/openai/models', {
          headers: { Authorization: `Bearer ${credential.secrets.apiKey}` },
        });
      case 'ollama': {
        const baseUrl = String(credential.values.baseURL ?? 'http://localhost:11434/api');
        return fetch(`${baseUrl.replace(/\/$/, '')}/tags`, {
          headers:
            credential.values.headers && typeof credential.values.headers === 'object'
              ? Object.fromEntries(
                  Object.entries(credential.values.headers).map(([key, value]) => [
                    key,
                    String(value),
                  ]),
                )
              : undefined,
        });
      }
      case 'custom-openai-compatible': {
        const baseUrl = String(credential.values.baseURL ?? '');
        return fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
          headers: {
            Authorization: `Bearer ${credential.secrets.apiKey}`,
            ...(credential.values.headers && typeof credential.values.headers === 'object'
              ? Object.fromEntries(
                  Object.entries(credential.values.headers).map(([key, value]) => [
                    key,
                    String(value),
                  ]),
                )
              : {}),
          },
        });
      }
      default:
        return undefined;
    }
  }
}

export function createInMemoryLlmHubCoreService(
  options: Omit<LlmHubCoreServiceOptions, 'store'> = {},
): LlmHubCoreService {
  return new LlmHubCoreService({
    ...options,
    store: new MemoryCredentialStore(),
  });
}
