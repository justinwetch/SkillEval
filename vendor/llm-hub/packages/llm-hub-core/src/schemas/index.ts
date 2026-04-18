import { z } from 'zod';

import { FEATURE_FLAGS } from '../constants/feature-flags';
import {
  connectionStatusValues,
  modelKindValues,
  providerAuthKindValues,
  providerCapabilityValues,
  providerKindValues,
  uiActionKindValues,
  uiActionVariantValues,
  uiFieldTypeValues,
  uiVisibilityOperatorValues,
  uiVisibilitySourceValues,
  validationRuleTypeValues,
  type AuthValidationResult,
  type ConnectResult,
  type CredentialRecord,
  type HubConfig,
  type JSONValue,
  type ModelDefinition,
  type ProviderAuthMethod,
  type ProviderConnection,
  type ProviderDefinition,
  type ProviderUISchema,
  type SecretMask,
  type StoredOAuthSession,
  type UIActionSchema,
  type UIFieldSchema,
  type UISectionSchema,
  type UIStatusBadge,
  type UIValidationRule,
  type UIVisibilityRule,
} from '../types';

export const jsonValueSchema: z.ZodType<JSONValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const secretMaskSchema: z.ZodType<SecretMask> = z.object({
  fieldKey: z.string().min(1),
  maskedValue: z.string(),
  isSecret: z.literal(true),
  lastFour: z.string().optional(),
});

export const authValidationResultSchema: z.ZodType<AuthValidationResult> =
  z.object({
    valid: z.boolean(),
    status: z.enum(['success', 'warning', 'error']),
    message: z.string().optional(),
    fieldErrors: z.record(z.string(), z.string()),
    warnings: z.array(z.string()),
    secretMasks: z.array(secretMaskSchema),
    normalizedPayload: z.record(z.string(), jsonValueSchema).optional(),
  });

export const oauthCtaMetadataSchema = z.object({
  buttonLabel: z.string().min(1),
  authorizationUrl: z.string().url(),
  launchMode: z.enum(['redirect', 'popup', 'system_browser']),
  codeChallengeMethod: z.enum(['S256', 'plain']).optional(),
  tokenExchangeUrl: z.string().url().optional(),
  callbackParamKeys: z.array(z.string()).optional(),
});

export const providerAuthMethodSchema: z.ZodType<ProviderAuthMethod> =
  z.object({
    id: z.string().min(1),
    kind: z.enum(providerAuthKindValues),
    label: z.string().min(1),
    description: z.string().optional(),
    badges: z.array(z.string()),
    experimental: z.boolean().optional(),
    warning: z.string().optional(),
    featureFlag: z
      .enum([FEATURE_FLAGS.experimentalBrowserSessionAdapters])
      .optional(),
    supportsTesting: z.boolean().optional(),
    oauth: oauthCtaMetadataSchema.optional(),
  });

export const providerDefinitionSchema: z.ZodType<ProviderDefinition> =
  z.object({
    id: z.string().min(1),
    displayName: z.string().min(1),
    description: z.string().min(1),
    website: z.string().url().optional(),
    kind: z.enum(providerKindValues),
    authMethods: z.array(providerAuthMethodSchema).min(1),
    defaultAuthMethodId: z.string().min(1),
    capabilities: z.array(z.enum(providerCapabilityValues)),
    badges: z.array(z.string()),
    warnings: z.array(z.string()),
    experimental: z.boolean().optional(),
  });

export const providerConnectionSchema: z.ZodType<ProviderConnection> =
  z.object({
    providerId: z.string().min(1),
    providerName: z.string().min(1),
    authMethodId: z.string().min(1),
    status: z.enum(connectionStatusValues),
    credentialId: z.string().optional(),
    connectedAt: z.string().optional(),
    updatedAt: z.string(),
    availableModelIds: z.array(z.string()),
    selectedModelId: z.string().optional(),
    warnings: z.array(z.string()),
    capabilities: z.array(z.enum(providerCapabilityValues)),
    isExperimental: z.boolean(),
  });

export const modelDefinitionSchema: z.ZodType<ModelDefinition> = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  fullModelId: z.string().min(3),
  displayName: z.string().min(1),
  description: z.string().optional(),
  kind: z.enum(modelKindValues),
  supportsStreaming: z.boolean(),
  supportsTools: z.boolean(),
  supportsVision: z.boolean(),
  supportsReasoning: z.boolean(),
  supportsEmbeddings: z.boolean(),
  isFree: z.boolean(),
  isExperimental: z.boolean(),
  tags: z.array(z.string()),
});

export const credentialRecordSchema: z.ZodType<CredentialRecord> = z.object({
  id: z.string().min(1),
  providerId: z.string().min(1),
  authMethodId: z.string().min(1),
  label: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  secrets: z.record(z.string(), z.string()),
  values: z.record(z.string(), jsonValueSchema),
});

export const uiValidationRuleSchema: z.ZodType<UIValidationRule> = z.object({
  type: z.enum(validationRuleTypeValues),
  value: z.union([z.string(), z.number()]).optional(),
  message: z.string().min(1),
});

export const uiVisibilityRuleSchema: z.ZodType<UIVisibilityRule> = z.object({
  source: z.enum(uiVisibilitySourceValues),
  key: z.string().min(1),
  operator: z.enum(uiVisibilityOperatorValues),
  value: z.union([z.string(), z.boolean(), z.array(z.string())]).optional(),
});

export const uiFieldOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
});

export const uiFieldSchema: z.ZodType<UIFieldSchema> = z.object({
  key: z.string().min(1),
  type: z.enum(uiFieldTypeValues),
  label: z.string().min(1),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  helperText: z.string().optional(),
  required: z.boolean(),
  defaultValue: jsonValueSchema.optional(),
  secret: z.boolean().optional(),
  masked: z.boolean().optional(),
  validationRules: z.array(uiValidationRuleSchema),
  options: z.array(uiFieldOptionSchema).optional(),
  visibility: z.array(uiVisibilityRuleSchema).optional(),
  badges: z.array(z.string()),
  warning: z.string().optional(),
  experimental: z.boolean().optional(),
});

export const uiSectionSchema: z.ZodType<UISectionSchema> = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  badges: z.array(z.string()),
  warnings: z.array(z.string()),
  fields: z.array(uiFieldSchema),
  visibility: z.array(uiVisibilityRuleSchema).optional(),
});

export const uiStatusBadgeSchema: z.ZodType<UIStatusBadge> = z.object({
  label: z.string().min(1),
  tone: z.enum(['neutral', 'success', 'warning', 'danger']),
});

export const uiActionSchema: z.ZodType<UIActionSchema> = z.object({
  id: z.string().min(1),
  kind: z.enum(uiActionKindValues),
  label: z.string().min(1),
  variant: z.enum(uiActionVariantValues),
  helperText: z.string().optional(),
  warning: z.string().optional(),
  experimental: z.boolean().optional(),
  oauth: oauthCtaMetadataSchema.optional(),
  visibility: z.array(uiVisibilityRuleSchema).optional(),
});

export const providerUISchemaSchema: z.ZodType<ProviderUISchema> = z.object({
  provider: providerDefinitionSchema,
  selectedAuthMethodId: z.string().min(1),
  status: z.enum(connectionStatusValues),
  statusBadge: uiStatusBadgeSchema,
  providerBadges: z.array(z.string()),
  capabilityBadges: z.array(z.enum(providerCapabilityValues)),
  warnings: z.array(z.string()),
  sections: z.array(uiSectionSchema),
  actions: z.array(uiActionSchema),
});

export const storedOAuthSessionSchema: z.ZodType<StoredOAuthSession> =
  z.object({
    id: z.string().min(1),
    providerId: z.string().min(1),
    authMethodId: z.string().min(1),
    callbackUrl: z.string().url(),
    state: z.string().min(1),
    codeVerifier: z.string().min(1),
    codeChallengeMethod: z.enum(['S256', 'plain']),
    createdAt: z.string(),
    expiresAt: z.string(),
  });

export const hubConfigSchema: z.ZodType<HubConfig> = z.object({
  featureFlags: z.record(z.string(), z.boolean()),
  connections: z.array(providerConnectionSchema),
  oauthSessions: z.array(storedOAuthSessionSchema),
});

export const credentialStoreFileSchema = z.object({
  credentials: z.array(credentialRecordSchema),
});

export const connectResultSchema: z.ZodType<ConnectResult> = z.discriminatedUnion(
  'kind',
  [
    z.object({
      kind: z.literal('oauth_pending'),
      providerId: z.string(),
      authMethodId: z.string(),
      launchUrl: z.string().url(),
      expiresAt: z.string(),
    }),
    z.object({
      kind: z.literal('validation_error'),
      providerId: z.string(),
      authMethodId: z.string(),
      validation: authValidationResultSchema,
    }),
    z.object({
      kind: z.literal('connected'),
      providerId: z.string(),
      authMethodId: z.string(),
      connection: providerConnectionSchema,
      validation: authValidationResultSchema,
    }),
  ],
);
