import type { FeatureFlagName } from '../constants/feature-flags';

export type JSONPrimitive = string | number | boolean | null;
export type JSONValue =
  | JSONPrimitive
  | JSONValue[]
  | { [key: string]: JSONValue };

export const providerCapabilityValues = [
  'tools',
  'vision',
  'streaming',
  'reasoning',
  'embeddings',
  'oauth',
  'local',
  'experimental',
] as const;

export type ProviderCapability = (typeof providerCapabilityValues)[number];

export const connectionStatusValues = [
  'disconnected',
  'connecting',
  'connected',
  'error',
  'expired',
] as const;

export type ConnectionStatus = (typeof connectionStatusValues)[number];

export const providerAuthKindValues = [
  'api_key',
  'openai_compatible',
  'local',
  'oauth_pkce',
  'browser_session',
] as const;

export type ProviderAuthKind = (typeof providerAuthKindValues)[number];

export const providerKindValues = [
  'direct_api_key',
  'openai_compatible',
  'local',
  'oauth',
  'hybrid',
] as const;

export type ProviderKind = (typeof providerKindValues)[number];

export const modelKindValues = ['language', 'embedding'] as const;

export type ModelKind = (typeof modelKindValues)[number];

export const uiFieldTypeValues = [
  'text',
  'password',
  'textarea',
  'checkbox',
  'select',
  'radio',
  'hidden',
] as const;

export type UIFieldType = (typeof uiFieldTypeValues)[number];

export const uiVisibilitySourceValues = [
  'selected_auth_method',
  'field',
  'feature_flag',
  'connection_status',
] as const;

export type UIVisibilitySource = (typeof uiVisibilitySourceValues)[number];

export const uiVisibilityOperatorValues = [
  'equals',
  'not_equals',
  'in',
  'not_in',
  'truthy',
  'falsy',
] as const;

export type UIVisibilityOperator = (typeof uiVisibilityOperatorValues)[number];

export const uiActionKindValues = [
  'connect',
  'disconnect',
  'test_connection',
  'oauth_launch',
] as const;

export type UIActionKind = (typeof uiActionKindValues)[number];

export const uiActionVariantValues = [
  'primary',
  'secondary',
  'danger',
] as const;

export type UIActionVariant = (typeof uiActionVariantValues)[number];

export const validationRuleTypeValues = [
  'min_length',
  'max_length',
  'regex',
  'url',
  'json',
] as const;

export type ValidationRuleType = (typeof validationRuleTypeValues)[number];

export interface SecretMask {
  fieldKey: string;
  maskedValue: string;
  isSecret: true;
  lastFour?: string;
}

export interface AuthValidationResult {
  valid: boolean;
  status: 'success' | 'warning' | 'error';
  message?: string;
  fieldErrors: Record<string, string>;
  warnings: string[];
  secretMasks: SecretMask[];
  normalizedPayload?: Record<string, JSONValue>;
}

export interface OAuthCTAMetadata {
  buttonLabel: string;
  authorizationUrl: string;
  launchMode: 'redirect' | 'popup' | 'system_browser';
  codeChallengeMethod?: 'S256' | 'plain';
  tokenExchangeUrl?: string;
  callbackParamKeys?: string[];
}

export interface ProviderAuthMethod {
  id: string;
  kind: ProviderAuthKind;
  label: string;
  description?: string;
  badges: string[];
  experimental?: boolean;
  warning?: string;
  featureFlag?: FeatureFlagName;
  supportsTesting?: boolean;
  oauth?: OAuthCTAMetadata;
}

export interface ProviderDefinition {
  id: string;
  displayName: string;
  description: string;
  website?: string;
  kind: ProviderKind;
  authMethods: ProviderAuthMethod[];
  defaultAuthMethodId: string;
  capabilities: ProviderCapability[];
  badges: string[];
  warnings: string[];
  experimental?: boolean;
}

export interface ProviderConnection {
  providerId: string;
  providerName: string;
  authMethodId: string;
  status: ConnectionStatus;
  credentialId?: string;
  connectedAt?: string;
  updatedAt: string;
  availableModelIds: string[];
  selectedModelId?: string;
  warnings: string[];
  capabilities: ProviderCapability[];
  isExperimental: boolean;
}

export interface ModelDefinition {
  providerId: string;
  modelId: string;
  fullModelId: string;
  displayName: string;
  description?: string;
  kind: ModelKind;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
  supportsEmbeddings: boolean;
  isFree: boolean;
  isExperimental: boolean;
  tags: string[];
}

export interface CredentialRecord {
  id: string;
  providerId: string;
  authMethodId: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  secrets: Record<string, string>;
  values: Record<string, JSONValue>;
}

export interface UIFieldOption {
  value: string;
  label: string;
  description?: string;
}

export interface UIValidationRule {
  type: ValidationRuleType;
  value?: string | number;
  message: string;
}

export interface UIVisibilityRule {
  source: UIVisibilitySource;
  key: string;
  operator: UIVisibilityOperator;
  value?: string | boolean | string[];
}

export interface UIFieldSchema {
  key: string;
  type: UIFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  helperText?: string;
  required: boolean;
  defaultValue?: JSONValue;
  secret?: boolean;
  masked?: boolean;
  validationRules: UIValidationRule[];
  options?: UIFieldOption[];
  visibility?: UIVisibilityRule[];
  badges: string[];
  warning?: string;
  experimental?: boolean;
}

export interface UISectionSchema {
  id: string;
  title: string;
  description?: string;
  badges: string[];
  warnings: string[];
  fields: UIFieldSchema[];
  visibility?: UIVisibilityRule[];
}

export interface UIStatusBadge {
  label: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
}

export interface UIActionSchema {
  id: string;
  kind: UIActionKind;
  label: string;
  variant: UIActionVariant;
  helperText?: string;
  warning?: string;
  experimental?: boolean;
  oauth?: OAuthCTAMetadata;
  visibility?: UIVisibilityRule[];
}

export interface ProviderUISchema {
  provider: ProviderDefinition;
  selectedAuthMethodId: string;
  status: ConnectionStatus;
  statusBadge: UIStatusBadge;
  providerBadges: string[];
  capabilityBadges: ProviderCapability[];
  warnings: string[];
  sections: UISectionSchema[];
  actions: UIActionSchema[];
}

export interface StoredOAuthSession {
  id: string;
  providerId: string;
  authMethodId: string;
  callbackUrl: string;
  state: string;
  codeVerifier: string;
  codeChallengeMethod: 'S256' | 'plain';
  createdAt: string;
  expiresAt: string;
}

export interface HubConfig {
  featureFlags: Record<FeatureFlagName, boolean>;
  connections: ProviderConnection[];
  oauthSessions: StoredOAuthSession[];
}

export interface SanitizedCredentialRecord
  extends Omit<CredentialRecord, 'secrets'> {
  secrets: Record<string, string>;
  secretMasks: SecretMask[];
}

export interface ConnectPendingOAuthResult {
  kind: 'oauth_pending';
  providerId: string;
  authMethodId: string;
  launchUrl: string;
  expiresAt: string;
}

export interface ConnectValidationErrorResult {
  kind: 'validation_error';
  providerId: string;
  authMethodId: string;
  validation: AuthValidationResult;
}

export interface ConnectSuccessResult {
  kind: 'connected';
  providerId: string;
  authMethodId: string;
  connection: ProviderConnection;
  validation: AuthValidationResult;
}

export type ConnectResult =
  | ConnectPendingOAuthResult
  | ConnectValidationErrorResult
  | ConnectSuccessResult;

export interface TestConnectionResult {
  ok: boolean;
  providerId: string;
  message: string;
  validation: AuthValidationResult;
}
