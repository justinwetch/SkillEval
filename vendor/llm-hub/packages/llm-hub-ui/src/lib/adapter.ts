import type {
  AuthMethodsResponseContract,
  ChatResponseContract,
  ConnectResponseContract,
  DefaultModelResponseContract,
  DisconnectResponseContract,
  EmbedResponseContract,
  LLMHubUIErrorShape,
  ModelsResponseContract,
  ProviderSchemaContract,
  ProvidersResponseContract,
  TestResponseContract,
} from '../types';

export interface LLMHubUIAdapter {
  getProviders(): Promise<ProvidersResponseContract>;
  getConnectedProviders(): Promise<ProvidersResponseContract>;
  getAuthMethods(providerId: string): Promise<AuthMethodsResponseContract>;
  getUISchema(
    providerId: string,
    methodId: string,
    hostMode: string,
  ): Promise<ProviderSchemaContract>;
  connect(
    providerId: string,
    body: { method: string; payload: Record<string, unknown>; defaultModelId?: string },
  ): Promise<ConnectResponseContract>;
  disconnect(providerId: string): Promise<DisconnectResponseContract>;
  testConnection(providerId: string): Promise<TestResponseContract>;
  getModels(providerId?: string): Promise<ModelsResponseContract>;
  setDefaultModel(providerId: string, modelId: string): Promise<DefaultModelResponseContract>;
  startOAuth(providerId: string, callbackUrl: string): Promise<ConnectResponseContract>;
  chat(body: {
    providerId?: string;
    modelId?: string;
    prompt?: string;
    messages?: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: unknown }>;
    system?: string;
  }): Promise<ChatResponseContract>;
  embed(body: {
    providerId?: string;
    modelId?: string;
    value?: string;
    values?: string[];
  }): Promise<EmbedResponseContract>;
  createOAuthCallbackUrl(providerId: string): string;
}

export class LLMHubUIRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'LLMHubUIRequestError';
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

export class FetchLLMHubUIAdapter implements LLMHubUIAdapter {
  private readonly fetchImpl: typeof fetch;

  constructor(
    public readonly baseUrl: string,
    fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {
    this.fetchImpl = fetchImpl;
  }

  async getProviders(): Promise<ProvidersResponseContract> {
    return this.request('/providers');
  }

  async getConnectedProviders(): Promise<ProvidersResponseContract> {
    return this.request('/providers/connected');
  }

  async getAuthMethods(providerId: string): Promise<AuthMethodsResponseContract> {
    return this.request(`/providers/${providerId}/auth-methods`);
  }

  async getUISchema(
    providerId: string,
    methodId: string,
    hostMode: string,
  ): Promise<ProviderSchemaContract> {
    const search = new URLSearchParams({ method: methodId, hostMode });
    return this.request(`/providers/${providerId}/ui-schema?${search.toString()}`);
  }

  async connect(
    providerId: string,
    body: { method: string; payload: Record<string, unknown>; defaultModelId?: string },
  ): Promise<ConnectResponseContract> {
    return this.request(`/providers/${providerId}/connect`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async disconnect(providerId: string): Promise<DisconnectResponseContract> {
    return this.request(`/providers/${providerId}/disconnect`, {
      method: 'POST',
    });
  }

  async testConnection(providerId: string): Promise<TestResponseContract> {
    return this.request(`/providers/${providerId}/test`, {
      method: 'POST',
    });
  }

  async getModels(providerId?: string): Promise<ModelsResponseContract> {
    const suffix = providerId ? `?providerId=${encodeURIComponent(providerId)}` : '';
    return this.request(`/models${suffix}`);
  }

  async setDefaultModel(
    providerId: string,
    modelId: string,
  ): Promise<DefaultModelResponseContract> {
    return this.request('/default-model', {
      method: 'POST',
      body: JSON.stringify({ providerId, modelId }),
    });
  }

  async startOAuth(providerId: string, callbackUrl: string): Promise<ConnectResponseContract> {
    const search = new URLSearchParams({ callbackUrl });
    return this.request(`/oauth/${providerId}/start?${search.toString()}`);
  }

  async chat(body: {
    providerId?: string;
    modelId?: string;
    prompt?: string;
    messages?: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: unknown }>;
    system?: string;
  }): Promise<ChatResponseContract> {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async embed(body: {
    providerId?: string;
    modelId?: string;
    value?: string;
    values?: string[];
  }): Promise<EmbedResponseContract> {
    return this.request('/embed', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  createOAuthCallbackUrl(providerId: string): string {
    return `${trimTrailingSlash(this.baseUrl)}/oauth/${providerId}/callback?format=html`;
  }

  private async request<T>(input: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchImpl(`${trimTrailingSlash(this.baseUrl)}${input}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const text = await response.text();
    const data = text ? (JSON.parse(text) as T | LLMHubUIErrorShape) : undefined;

    if (!response.ok) {
      const error = data as LLMHubUIErrorShape | undefined;
      throw new LLMHubUIRequestError(
        error?.error.message ?? 'Request failed.',
        error?.error.code ?? 'REQUEST_FAILED',
        response.status,
        error?.error.details,
      );
    }

    return data as T;
  }
}
