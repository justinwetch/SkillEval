import type {
  AuthValidationResult,
  ConnectionStatus,
  ProviderCapability,
  ProviderUISchema,
  SecretMask,
  TestConnectionResult,
  UIActionSchema,
  UISectionSchema,
  UIVisibilityRule,
} from '@llm-hub/core';

export const hostModeValues = [
  'compact',
  'sidebar',
  'full_settings_page',
  'modal_only',
] as const;

export type HostMode = (typeof hostModeValues)[number];

export interface DefaultModelSelection {
  providerId: string;
  modelId: string;
  updatedAt: string;
}

export interface ConnectionHealthRecord {
  ok: boolean;
  status: 'healthy' | 'unhealthy';
  message: string;
  checkedAt: string;
}

export interface ServerState {
  defaultModel: DefaultModelSelection | null;
  connectionHealth: Record<string, ConnectionHealthRecord>;
}

export interface AuthMethodContract {
  id: string;
  label: string;
  type: string;
  uxMode: 'form' | 'oauth_redirect' | 'local_detect' | 'browser_session_experimental';
  description?: string;
  warning?: string;
  experimental: boolean;
  available: boolean;
  availabilityMessage?: string;
  badges: string[];
  schemaSummary: {
    fieldGroups: Array<{
      id: string;
      title: string;
      fieldCount: number;
      requiredFieldKeys: string[];
      hasSecretFields: boolean;
      hasConditionalFields: boolean;
    }>;
    totalFields: number;
    requiredFieldKeys: string[];
  };
  ctaMetadata?: {
    buttonLabel: string;
    launchMode: string;
    authorizationUrl: string;
    tokenExchangeUrl?: string;
  };
}

export interface ProviderSummaryContract {
  id: string;
  name: string;
  category: string;
  connected: boolean;
  default: boolean;
  availableAuthMethods: Array<{
    id: string;
    label: string;
    type: string;
    uxMode: AuthMethodContract['uxMode'];
    experimental: boolean;
    available: boolean;
    availabilityMessage?: string;
    warning?: string;
  }>;
  capabilities: ProviderCapability[];
  warningBadges: string[];
  experimental: boolean;
  uiHints: {
    preferredHostMode: HostMode;
    supportedHostModes: HostMode[];
    showModelPicker: boolean;
    supportsCompactStatus: boolean;
  };
  connection: null | {
    status: ConnectionStatus;
    authMethodId: string;
    selectedModelId?: string;
    connectedAt?: string;
    updatedAt: string;
    credentialLabel?: string;
    secretMasks: SecretMask[];
    health?: ConnectionHealthRecord;
  };
}

export interface ProviderSchemaContract {
  provider: ProviderSummaryContract;
  hostMode: HostMode;
  schema: ProviderUISchema;
  layoutHints: {
    density: 'compact' | 'comfortable';
    chrome: 'card' | 'sidebar_panel' | 'page' | 'modal';
    actionsPlacement: 'inline' | 'footer' | 'sticky_footer';
    defaultSectionState: 'expanded' | 'collapsed';
    emphasizeWarnings: boolean;
  };
  fieldGroups: UISectionSchema[];
  primaryAction?: UIActionSchema;
  secondaryAction?: UIActionSchema;
  validationErrors: Record<string, string>;
  successStateText: string;
  emptyStateText: string;
  experimentalWarnings: string[];
  conditionalVisibility: Array<{
    target: string;
    scope: 'field' | 'section' | 'action';
    rules: UIVisibilityRule[];
  }>;
}

export interface ConnectResponseContract {
  state: 'connected' | 'oauth_pending';
  provider: ProviderSummaryContract;
  validation?: AuthValidationResult;
  launchUrl?: string;
  expiresAt?: string;
}

export interface TestResponseContract {
  provider: ProviderSummaryContract;
  result: TestConnectionResult;
}

export interface ChatResponseContract {
  providerId: string;
  modelId: string;
  text: string;
  finishReason?: string;
  usage?: unknown;
  warnings?: unknown;
}

export interface EmbedResponseContract {
  providerId: string;
  modelId: string;
  embeddings: number[][];
  usage?: unknown;
  warnings?: unknown;
}
