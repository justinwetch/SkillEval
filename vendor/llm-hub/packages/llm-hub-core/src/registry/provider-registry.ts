import { createProviderRegistry, customProvider } from 'ai';

import { ProviderNotFoundError } from '../errors';
import { findCatalogModel, listCatalogModels } from '../models/catalog';
import type { RegisteredProviderDefinition } from '../providers/definitions';
import type { CredentialRecord, ModelDefinition, ProviderConnection, ProviderDefinition } from '../types';
import { buildSdkProvider, type AiLanguageModel, type AiRegistryProvider } from './sdk-provider-factory';

type LanguageModelEntry = ReturnType<AiRegistryProvider['languageModel']>;
type EmbeddingModelEntry = ReturnType<AiRegistryProvider['embeddingModel']>;

export class LlmHubProviderRegistry {
  private readonly providerIndex = new Map<string, RegisteredProviderDefinition>();

  constructor(
    private readonly providers: RegisteredProviderDefinition[],
    private readonly models: ModelDefinition[],
  ) {
    for (const provider of providers) {
      this.providerIndex.set(provider.provider.id, provider);
    }
  }

  listProviders(): ProviderDefinition[] {
    return this.providers.map((provider) => provider.provider);
  }

  getRegisteredProvider(providerId: string): RegisteredProviderDefinition | undefined {
    return this.providerIndex.get(providerId);
  }

  requireRegisteredProvider(providerId: string): RegisteredProviderDefinition {
    const provider = this.getRegisteredProvider(providerId);

    if (!provider) {
      throw new ProviderNotFoundError(providerId);
    }

    return provider;
  }

  listModels(providerId?: string): ModelDefinition[] {
    return listCatalogModels(this.models, providerId);
  }

  getModel(providerId: string, modelId: string): ModelDefinition | undefined {
    return findCatalogModel(this.models, providerId, modelId);
  }

  resolveRuntimeModelId(
    providerId: string,
    modelId: string,
    credential?: CredentialRecord,
  ): string {
    if (providerId !== 'custom-openai-compatible' || !credential) {
      return modelId;
    }

    const modelPrefix = credential.values.modelPrefix;

    if (typeof modelPrefix !== 'string' || modelPrefix.length === 0) {
      return modelId;
    }

    if (modelId.startsWith(modelPrefix)) {
      return modelId;
    }

    return `${modelPrefix}${modelId}`;
  }

  buildConnectedRegistry(options: {
    connections: ProviderConnection[];
    credentials: CredentialRecord[];
  }) {
    const credentialsById = new Map(
      options.credentials.map((credential) => [credential.id, credential]),
    );
    const providerMap = options.connections.reduce<Record<string, AiRegistryProvider>>(
      (accumulator, connection) => {
        if (connection.status !== 'connected' || !connection.credentialId) {
          return accumulator;
        }

        if (connection.providerId === 'codex-cli') {
          return accumulator;
        }

        const credential = credentialsById.get(connection.credentialId);

        if (!credential) {
          return accumulator;
        }

        const registeredProvider = this.requireRegisteredProvider(connection.providerId);
        const sdkProvider = buildSdkProvider(connection.providerId, credential);
        const languageModels = this.listModels(connection.providerId)
          .filter((model) => model.kind === 'language')
          .reduce<Record<string, LanguageModelEntry>>((entries, model) => {
            entries[model.modelId] = sdkProvider.languageModel(
              this.resolveRuntimeModelId(connection.providerId, model.modelId, credential),
            ) as LanguageModelEntry;
            return entries;
          }, {});

        const embeddingModels = this.listModels(connection.providerId)
          .filter((model) => model.kind === 'embedding')
          .reduce<Record<string, EmbeddingModelEntry>>((entries, model) => {
            entries[model.modelId] = sdkProvider.embeddingModel(
              this.resolveRuntimeModelId(connection.providerId, model.modelId, credential),
            ) as EmbeddingModelEntry;
            return entries;
          }, {});

        accumulator[connection.providerId] = customProvider({
          languageModels,
          embeddingModels,
          fallbackProvider: sdkProvider,
        }) as AiRegistryProvider;

        return accumulator;
      },
      {},
    );

    return createProviderRegistry(providerMap);
  }

  getLanguageModel(options: {
    providerId: string;
    modelId: string;
    connections: ProviderConnection[];
    credentials: CredentialRecord[];
  }): AiLanguageModel {
    const connection = options.connections.find(
      (item) => item.providerId === options.providerId && item.status === 'connected',
    );
    const credential = connection?.credentialId
      ? options.credentials.find((item) => item.id === connection.credentialId)
      : undefined;
    const runtimeModelId = this.resolveRuntimeModelId(
      options.providerId,
      options.modelId,
      credential,
    );
    const registry = this.buildConnectedRegistry(options);

    return registry.languageModel(`${options.providerId}:${runtimeModelId}`);
  }
}
