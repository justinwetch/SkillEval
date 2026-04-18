import type { ModelDefinition, UIActionSchema } from '@llm-hub/core';
import type {
  AuthMethodContract,
  ChatResponseContract,
  ConnectResponseContract,
  EmbedResponseContract,
  HostMode,
  ProviderSchemaContract,
  ProviderSummaryContract,
  TestResponseContract,
} from '@llm-hub/server';

export type LLMHubUIHostMode = HostMode;
export type LLMHubUIDensity = 'compact' | 'comfortable' | 'auto';

export interface LLMHubUIFeedback {
  tone: 'success' | 'danger' | 'warning' | 'info';
  text: string;
  actionId?: string;
}

export interface LLMHubUIActionCompleteEvent<Result = unknown> {
  action: UIActionSchema;
  result: Result;
  providerId: string;
  authMethodId?: string;
}

export interface DefaultModelSelection {
  providerId: string;
  modelId: string;
  updatedAt: string;
}

export interface ServerModelRecord extends ModelDefinition {
  connected: boolean;
  default: boolean;
}

export interface ProvidersResponseContract {
  providers: ProviderSummaryContract[];
}

export interface AuthMethodsResponseContract {
  providerId: string;
  authMethods: AuthMethodContract[];
}

export interface ModelsResponseContract {
  defaultModel: DefaultModelSelection | null;
  models: ServerModelRecord[];
}

export interface DisconnectResponseContract {
  ok: true;
  provider: ProviderSummaryContract;
}

export interface DefaultModelResponseContract {
  defaultModel: DefaultModelSelection;
}

export interface LLMHubUIErrorShape {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type {
  AuthMethodContract,
  ChatResponseContract,
  ConnectResponseContract,
  EmbedResponseContract,
  ProviderSchemaContract,
  ProviderSummaryContract,
  TestResponseContract,
};
