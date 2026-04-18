import {
  FileJsonCredentialStore,
  LlmHubCoreService,
  LlmHubProviderRegistry,
  ProviderNotConnectedError,
  isVisible,
  seedModels,
  seedProviders,
  type AuthValidationResult,
  type ConnectResult,
  type CredentialStore,
  type JSONValue,
  type ModelDefinition,
  type ProviderAuthMethod,
  type ProviderConnection,
  type ProviderDefinition,
  type ProviderUISchema,
  type TestConnectionResult,
  type UIActionSchema,
} from '@llm-hub/core';
import { embed, embedMany, generateText } from 'ai';

import type {
  AuthMethodContract,
  ChatResponseContract,
  ConnectResponseContract,
  ConnectionHealthRecord,
  DefaultModelSelection,
  EmbedResponseContract,
  HostMode,
  ProviderSchemaContract,
  ProviderSummaryContract,
} from '../contracts';
import { LlmHubServerError } from '../errors';
import { getLayoutHints } from './layout-hints';
import {
  FileJsonServerStateStore,
  type ServerStateStore,
} from './server-state-store';

interface ConnectedContext {
  connections: ProviderConnection[];
  state: Awaited<ReturnType<ServerStateStore['getState']>>;
}

export interface LlmHubServerServiceOptions {
  baseDir?: string;
  publicBaseUrl?: string;
  credentialStore?: CredentialStore;
  stateStore?: ServerStateStore;
  coreService?: LlmHubCoreService;
  providerRegistry?: LlmHubProviderRegistry;
  generateTextImpl?: typeof generateText;
  embedImpl?: typeof embed;
  embedManyImpl?: typeof embedMany;
}

export class LlmHubServerService {
  private readonly credentialStore: CredentialStore;
  private readonly stateStore: ServerStateStore;
  private readonly coreService: LlmHubCoreService;
  private readonly providerRegistry: LlmHubProviderRegistry;
  private readonly publicBaseUrl?: string;
  private readonly generateTextImpl: typeof generateText;
  private readonly embedImpl: typeof embed;
  private readonly embedManyImpl: typeof embedMany;

  constructor(options: LlmHubServerServiceOptions = {}) {
    this.credentialStore =
      options.credentialStore ??
      new FileJsonCredentialStore(options.baseDir ?? process.cwd());
    this.stateStore =
      options.stateStore ??
      new FileJsonServerStateStore(options.baseDir ?? process.cwd());
    this.coreService =
      options.coreService ??
      new LlmHubCoreService({
        baseDir: options.baseDir,
        store: this.credentialStore,
      });
    this.providerRegistry =
      options.providerRegistry ?? new LlmHubProviderRegistry(seedProviders, seedModels);
    this.publicBaseUrl = options.publicBaseUrl;
    this.generateTextImpl = options.generateTextImpl ?? generateText;
    this.embedImpl = options.embedImpl ?? embed;
    this.embedManyImpl = options.embedManyImpl ?? embedMany;
  }

  async listProviders(): Promise<ProviderSummaryContract[]> {
    const [providers, context] = await Promise.all([
      Promise.resolve(this.coreService.listProviders()),
      this.getConnectedContext(),
    ]);

    return Promise.all(
      providers.map((provider) => this.buildProviderSummary(provider, context)),
    );
  }

  async listConnectedProviders(): Promise<ProviderSummaryContract[]> {
    const [providers, context] = await Promise.all([
      Promise.resolve(this.coreService.listProviders()),
      this.getConnectedContext(),
    ]);

    return Promise.all(
      providers
        .filter((provider) =>
          context.connections.some((connection) => connection.providerId === provider.id),
        )
        .map((provider) => this.buildProviderSummary(provider, context)),
    );
  }

  async getProviderAuthMethods(providerId: string): Promise<AuthMethodContract[]> {
    const methods = this.coreService.getAuthMethods(providerId);

    return Promise.all(
      methods.map(async (method) => {
        const schema = await this.coreService.getProviderUISchema(providerId, method.id);
        return this.buildAuthMethodContract(method, schema);
      }),
    );
  }

  async getProviderUISchema(
    providerId: string,
    methodId: string | undefined,
    hostMode: HostMode,
    validationErrors: Record<string, string> = {},
  ): Promise<ProviderSchemaContract> {
    const [schema, providers] = await Promise.all([
      this.coreService.getProviderUISchema(providerId, methodId),
      this.listProviders(),
    ]);
    const provider = providers.find((item) => item.id === providerId);

    if (!provider) {
      throw new LlmHubServerError(404, 'PROVIDER_NOT_FOUND', `Unknown provider: ${providerId}`);
    }

    const primaryAction = this.findVisibleAction(schema.actions, schema, 'primary');
    const secondaryAction =
      this.findVisibleAction(schema.actions, schema, 'secondary') ??
      this.findVisibleAction(schema.actions, schema, 'danger');
    const experimentalWarnings = this.collectExperimentalWarnings(schema);

    return {
      provider,
      hostMode,
      schema,
      layoutHints: getLayoutHints(hostMode),
      fieldGroups: schema.sections,
      primaryAction,
      secondaryAction,
      validationErrors,
      successStateText: `${provider.name} is ready to use.`,
      emptyStateText: `Choose an authentication method to configure ${provider.name}.`,
      experimentalWarnings,
      conditionalVisibility: this.collectConditionalVisibility(schema),
    };
  }

  async connectProvider(options: {
    providerId: string;
    methodId: string;
    payload: Record<string, JSONValue>;
    defaultModelId?: string;
  }): Promise<ConnectResponseContract> {
    const selectedMethod = this.coreService
      .getAuthMethods(options.providerId)
      .find((method) => method.id === options.methodId);

    if (selectedMethod && !this.isMethodAvailable(selectedMethod)) {
      throw new LlmHubServerError(
        501,
        'AUTH_METHOD_UNAVAILABLE',
        this.getMethodAvailabilityMessage(selectedMethod) ??
          'This auth method is not yet available.',
        {
          providerId: options.providerId,
          authMethodId: options.methodId,
        },
      );
    }

    const result = await this.coreService.connect(
      options.providerId,
      options.methodId,
      options.payload,
    );

    if (result.kind === 'validation_error') {
      throw new LlmHubServerError(400, 'VALIDATION_ERROR', 'Provider connection failed validation.', {
        providerId: options.providerId,
        authMethodId: options.methodId,
        validation: result.validation,
      });
    }

    if (result.kind === 'oauth_pending') {
      const provider = await this.getProviderSummary(options.providerId);
      return {
        state: 'oauth_pending',
        provider,
        launchUrl: result.launchUrl,
        expiresAt: result.expiresAt,
      };
    }

    if (options.defaultModelId) {
      await this.setDefaultModel(options.providerId, options.defaultModelId);
    }

    const provider = await this.getProviderSummary(options.providerId);

    return {
      state: 'connected',
      provider,
      validation: result.validation,
    };
  }

  async disconnectProvider(providerId: string): Promise<ProviderSummaryContract> {
    await this.coreService.disconnect(providerId);
    const state = await this.stateStore.getState();

    if (state.defaultModel?.providerId === providerId) {
      state.defaultModel = null;
    }

    delete state.connectionHealth[providerId];
    await this.stateStore.saveState(state);

    return this.getProviderSummary(providerId);
  }

  async testProvider(providerId: string): Promise<{ provider: ProviderSummaryContract; result: TestConnectionResult }> {
    const result = await this.coreService.testConnection(providerId);
    const state = await this.stateStore.getState();

    state.connectionHealth[providerId] = {
      ok: result.ok,
      status: result.ok ? 'healthy' : 'unhealthy',
      message: result.message,
      checkedAt: new Date().toISOString(),
    };

    await this.stateStore.saveState(state);

    return {
      provider: await this.getProviderSummary(providerId),
      result,
    };
  }

  async listModels(providerId?: string) {
    const state = await this.stateStore.getState();
    const connections = await this.coreService.listConnectedProviders();
    const models = this.coreService.listModels(providerId).map((model) => ({
      ...model,
      connected:
        connections.some((connection) => connection.providerId === model.providerId) ?? false,
      default:
        state.defaultModel?.providerId === model.providerId &&
        state.defaultModel?.modelId === model.modelId,
    }));

    return {
      defaultModel: state.defaultModel,
      models,
    };
  }

  async setDefaultModel(providerId: string, modelId: string): Promise<DefaultModelSelection> {
    const model = this.providerRegistry.getModel(providerId, modelId);

    if (!model) {
      throw new LlmHubServerError(404, 'MODEL_NOT_FOUND', `Unknown model ${providerId}:${modelId}`);
    }

    const selection: DefaultModelSelection = {
      providerId,
      modelId,
      updatedAt: new Date().toISOString(),
    };
    const state = await this.stateStore.getState();
    state.defaultModel = selection;
    await this.stateStore.saveState(state);

    const config = await this.credentialStore.getConfig();
    const connection = config.connections.find((item) => item.providerId === providerId);

    if (connection) {
      connection.selectedModelId = modelId;
      connection.updatedAt = selection.updatedAt;
      await this.credentialStore.saveConfig(config);
    }

    return selection;
  }

  async startOAuth(providerId: string, callbackUrl: string) {
    return this.connectProvider({
      providerId,
      methodId: 'oauth_pkce',
      payload: { callbackUrl },
    });
  }

  async completeOAuth(providerId: string, callbackQuery: Record<string, string>) {
    const result = await this.coreService.completeOAuth(providerId, callbackQuery);

    if (result.kind === 'validation_error') {
      throw new LlmHubServerError(400, 'VALIDATION_ERROR', 'OAuth completion failed validation.', {
        validation: result.validation,
      });
    }

    if (result.kind !== 'connected') {
      throw new LlmHubServerError(500, 'UNEXPECTED_OAUTH_STATE', 'Unexpected OAuth completion state.');
    }

    return {
      state: 'connected' as const,
      provider: await this.getProviderSummary(providerId),
      validation: result.validation,
    };
  }

  async chat(input: {
    providerId?: string;
    modelId?: string;
    prompt?: string;
    messages?: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: unknown }>;
    system?: string;
    maxOutputTokens?: number;
    temperature?: number;
  }): Promise<ChatResponseContract> {
    const { providerId, modelId } = await this.resolveLanguageSelection(
      input.providerId,
      input.modelId,
    );
    const model = await this.coreService.getLanguageModel(providerId, modelId);
    const baseOptions = {
      model,
      system: input.system,
      maxOutputTokens: input.maxOutputTokens,
      temperature: input.temperature,
    };
    const result = input.messages?.length
      ? await this.generateTextImpl({
          ...baseOptions,
          messages: input.messages as NonNullable<Parameters<typeof generateText>[0]['messages']>,
        })
      : await this.generateTextImpl({
          ...baseOptions,
          prompt: input.prompt ?? '',
        });

    return {
      providerId,
      modelId,
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
      warnings: result.warnings,
    };
  }

  async embed(input: {
    providerId?: string;
    modelId?: string;
    value?: string;
    values?: string[];
  }): Promise<EmbedResponseContract> {
    const { providerId, modelId } = await this.resolveEmbeddingSelection(
      input.providerId,
      input.modelId,
    );
    const [connections, credentials] = await Promise.all([
      this.coreService.listConnectedProviders(),
      this.credentialStore.listCredentialRecordsUnsafe(),
    ]);
    const registry = this.providerRegistry.buildConnectedRegistry({
      connections,
      credentials,
    });
    const model = registry.embeddingModel(`${providerId}:${modelId}`);

    if (input.values?.length) {
      const result = await this.embedManyImpl({ model, values: input.values });
      return {
        providerId,
        modelId,
        embeddings: result.embeddings,
        usage: result.usage,
        warnings: result.warnings,
      };
    }

    const result = await this.embedImpl({ model, value: input.value ?? '' });
    return {
      providerId,
      modelId,
      embeddings: [result.embedding],
      usage: result.usage,
      warnings: result.warnings,
    };
  }

  resolveCallbackUrl(providerId: string, requestOrigin: string): string {
    const base = this.publicBaseUrl ?? requestOrigin;
    return `${base.replace(/\/$/, '')}/oauth/${providerId}/callback`;
  }

  private async getConnectedContext(): Promise<ConnectedContext> {
    const [connections, state] = await Promise.all([
      this.coreService.listConnectedProviders(),
      this.stateStore.getState(),
    ]);

    return { connections, state };
  }

  private async getProviderSummary(providerId: string): Promise<ProviderSummaryContract> {
    const providers = await this.listProviders();
    const provider = providers.find((item) => item.id === providerId);

    if (!provider) {
      throw new LlmHubServerError(404, 'PROVIDER_NOT_FOUND', `Unknown provider: ${providerId}`);
    }

    return provider;
  }

  private async buildProviderSummary(
    provider: ProviderDefinition,
    context: ConnectedContext,
  ): Promise<ProviderSummaryContract> {
    const connection = context.connections.find((item) => item.providerId === provider.id);
    const publicCredential = connection?.credentialId
      ? await this.credentialStore.getPublicCredential(connection.credentialId)
      : undefined;

    return {
      id: provider.id,
      name: provider.displayName,
      category: provider.kind,
      connected: Boolean(connection),
      default: context.state.defaultModel?.providerId === provider.id,
      availableAuthMethods: provider.authMethods.map((method) => ({
        id: method.id,
        label: method.label,
        type: method.kind,
        uxMode: this.getUxMode(method),
        experimental: Boolean(method.experimental),
        available: this.isMethodAvailable(method),
        availabilityMessage: this.getMethodAvailabilityMessage(method),
        warning: method.warning,
      })),
      capabilities: provider.capabilities,
      warningBadges: [...provider.warnings],
      experimental: Boolean(provider.experimental),
      uiHints: {
        preferredHostMode: this.getPreferredHostMode(provider),
        supportedHostModes: ['compact', 'sidebar', 'full_settings_page', 'modal_only'],
        showModelPicker: this.coreService.listModels(provider.id).length > 0,
        supportsCompactStatus: true,
      },
          connection: connection
        ? {
            status: connection.status,
            authMethodId: connection.authMethodId,
            selectedModelId: connection.selectedModelId,
            connectedAt: connection.connectedAt,
            updatedAt: connection.updatedAt,
            credentialLabel: publicCredential?.label,
            secretMasks: publicCredential?.secretMasks ?? [],
            health: context.state.connectionHealth[provider.id],
          }
        : null,
    };
  }

  private async buildAuthMethodContract(
    method: ProviderAuthMethod,
    schema: ProviderUISchema,
  ): Promise<AuthMethodContract> {
    const sections = schema.sections.filter((section) =>
      section.id !== 'auth-method-selector' && section.id !== 'model-picker'
        ? isVisible(section.visibility, {
            selectedAuthMethodId: method.id,
            connectionStatus: schema.status,
          })
        : false,
    );
    const fieldGroups = sections.map((section) => ({
      id: section.id,
      title: section.title,
      fieldCount: section.fields.length,
      requiredFieldKeys: section.fields.filter((field) => field.required).map((field) => field.key),
      hasSecretFields: section.fields.some((field) => field.secret),
      hasConditionalFields: section.fields.some((field) => Boolean(field.visibility?.length)),
    }));

    return {
      id: method.id,
      label: method.label,
      type: method.kind,
      uxMode: this.getUxMode(method),
      description: method.description,
      warning: method.warning,
      experimental: Boolean(method.experimental),
      available: this.isMethodAvailable(method),
      availabilityMessage: this.getMethodAvailabilityMessage(method),
      badges: [...method.badges],
      schemaSummary: {
        fieldGroups,
        totalFields: sections.flatMap((section) => section.fields).length,
        requiredFieldKeys: sections
          .flatMap((section) => section.fields)
          .filter((field) => field.required)
          .map((field) => field.key),
      },
      ctaMetadata: method.oauth
        ? {
            buttonLabel: method.oauth.buttonLabel,
            launchMode: method.oauth.launchMode,
            authorizationUrl: method.oauth.authorizationUrl,
            tokenExchangeUrl: method.oauth.tokenExchangeUrl,
          }
        : undefined,
    };
  }

  private getPreferredHostMode(provider: ProviderDefinition): HostMode {
    if (provider.kind === 'local') {
      return 'modal_only';
    }

    if (provider.capabilities.includes('oauth')) {
      return 'sidebar';
    }

    return 'full_settings_page';
  }

  private getUxMode(method: ProviderAuthMethod): AuthMethodContract['uxMode'] {
    if (method.kind === 'oauth_pkce') {
      return 'oauth_redirect';
    }

    if (method.kind === 'local') {
      return 'local_detect';
    }

    if (method.kind === 'browser_session') {
      return 'browser_session_experimental';
    }

    return 'form';
  }

  private isMethodAvailable(method: ProviderAuthMethod): boolean {
    if (method.kind === 'oauth_pkce') {
      return Boolean(method.oauth?.authorizationUrl);
    }

    return true;
  }

  private getMethodAvailabilityMessage(
    method: ProviderAuthMethod,
  ): string | undefined {
    if (this.isMethodAvailable(method)) {
      return undefined;
    }

    return method.warning ?? 'This auth method is not yet available.';
  }

  private collectConditionalVisibility(schema: ProviderUISchema) {
    return [
      ...schema.sections
        .filter((section) => section.visibility?.length)
        .map((section) => ({
          target: section.id,
          scope: 'section' as const,
          rules: section.visibility ?? [],
        })),
      ...schema.sections.flatMap((section) =>
        section.fields
          .filter((field) => field.visibility?.length)
          .map((field) => ({
            target: field.key,
            scope: 'field' as const,
            rules: field.visibility ?? [],
          })),
      ),
      ...schema.actions
        .filter((action) => action.visibility?.length)
        .map((action) => ({
          target: action.id,
          scope: 'action' as const,
          rules: action.visibility ?? [],
        })),
    ];
  }

  private collectExperimentalWarnings(schema: ProviderUISchema): string[] {
    const warnings = new Set<string>(schema.warnings);

    for (const section of schema.sections) {
      for (const warning of section.warnings) {
        warnings.add(warning);
      }

      for (const field of section.fields) {
        if (field.warning) {
          warnings.add(field.warning);
        }
        if (field.experimental) {
          warnings.add(`${field.label} is experimental.`);
        }
      }
    }

    for (const action of schema.actions) {
      if (action.warning) {
        warnings.add(action.warning);
      }
      if (action.experimental) {
        warnings.add(`${action.label} is experimental.`);
      }
    }

    return [...warnings];
  }

  private findVisibleAction(
    actions: UIActionSchema[],
    schema: ProviderUISchema,
    variant: UIActionSchema['variant'],
  ): UIActionSchema | undefined {
    return actions.find(
      (action) =>
        action.variant === variant &&
        isVisible(action.visibility, {
          selectedAuthMethodId: schema.selectedAuthMethodId,
          connectionStatus: schema.status,
        }),
    );
  }

  private async resolveLanguageSelection(
    providerId?: string,
    modelId?: string,
  ): Promise<{ providerId: string; modelId: string }> {
    if (providerId && modelId) {
      return { providerId, modelId };
    }

    const [connections, state] = await Promise.all([
      this.coreService.listConnectedProviders(),
      this.stateStore.getState(),
    ]);

    if (providerId) {
      return {
        providerId,
        modelId:
          modelId ??
          connections.find((connection) => connection.providerId === providerId)?.selectedModelId ??
          this.requireLanguageModel(providerId).modelId,
      };
    }

    if (state.defaultModel) {
      return state.defaultModel;
    }

    const connectedWithModel = connections.find((connection) => connection.selectedModelId);

    if (connectedWithModel?.selectedModelId) {
      return {
        providerId: connectedWithModel.providerId,
        modelId: connectedWithModel.selectedModelId,
      };
    }

    const provider = this.coreService.listProviders()[0];

    if (!provider) {
      throw new LlmHubServerError(404, 'NO_PROVIDERS', 'No providers are registered.');
    }

    return {
      providerId: provider.id,
      modelId: this.requireLanguageModel(provider.id).modelId,
    };
  }

  private async resolveEmbeddingSelection(
    providerId?: string,
    modelId?: string,
  ): Promise<{ providerId: string; modelId: string }> {
    if (providerId && modelId) {
      return { providerId, modelId };
    }

    const state = await this.stateStore.getState();

    if (providerId) {
      return {
        providerId,
        modelId: modelId ?? this.requireEmbeddingModel(providerId).modelId,
      };
    }

    if (state.defaultModel) {
      const embeddingModel = this.coreService
        .listModels(state.defaultModel.providerId)
        .find((model) => model.kind === 'embedding');

      if (embeddingModel) {
        return {
          providerId: embeddingModel.providerId,
          modelId: embeddingModel.modelId,
        };
      }
    }

    const embeddingModel = this.coreService
      .listProviders()
      .flatMap((provider) => this.coreService.listModels(provider.id))
      .find((model) => model.kind === 'embedding');

    if (!embeddingModel) {
      throw new LlmHubServerError(404, 'EMBEDDING_MODEL_NOT_FOUND', 'No embedding model is available.');
    }

    return {
      providerId: embeddingModel.providerId,
      modelId: embeddingModel.modelId,
    };
  }

  private requireLanguageModel(providerId: string): ModelDefinition {
    const model = this.coreService.listModels(providerId).find((item) => item.kind === 'language');

    if (!model) {
      throw new LlmHubServerError(404, 'MODEL_NOT_FOUND', `No language model found for ${providerId}.`);
    }

    return model;
  }

  private requireEmbeddingModel(providerId: string): ModelDefinition {
    const model = this.coreService.listModels(providerId).find((item) => item.kind === 'embedding');

    if (!model) {
      throw new LlmHubServerError(404, 'EMBEDDING_MODEL_NOT_FOUND', `No embedding model found for ${providerId}.`);
    }

    return model;
  }
}
