import { providerUISchemaSchema } from '../schemas';
import type {
  ConnectionStatus,
  ModelDefinition,
  ProviderUISchema,
  UIActionSchema,
  UIFieldSchema,
  UISectionSchema,
  UIVisibilityRule,
} from '../types';
import { getEnabledAuthMethods, type RegisteredProviderDefinition } from '../providers/definitions';

function methodVisibility(methodId: string): UIVisibilityRule[] {
  return [
    {
      source: 'selected_auth_method',
      key: 'authMethod',
      operator: 'equals',
      value: methodId,
    },
  ];
}

function statusBadge(status: ConnectionStatus): ProviderUISchema['statusBadge'] {
  switch (status) {
    case 'connected':
      return { label: 'Connected', tone: 'success' };
    case 'connecting':
      return { label: 'Connecting', tone: 'warning' };
    case 'error':
      return { label: 'Error', tone: 'danger' };
    case 'expired':
      return { label: 'Expired', tone: 'warning' };
    default:
      return { label: 'Disconnected', tone: 'neutral' };
  }
}

function cloneField(field: UIFieldSchema, visibility?: UIVisibilityRule[]): UIFieldSchema {
  return {
    ...field,
    validationRules: [...field.validationRules],
    options: field.options ? [...field.options] : undefined,
    badges: [...field.badges],
    visibility: [...(field.visibility ?? []), ...(visibility ?? [])],
  };
}

function cloneSection(section: UISectionSchema, visibility?: UIVisibilityRule[]): UISectionSchema {
  return {
    ...section,
    badges: [...section.badges],
    warnings: [...section.warnings],
    visibility: [...(section.visibility ?? []), ...(visibility ?? [])],
    fields: section.fields.map((field) => cloneField(field)),
  };
}

export function buildProviderUISchema(options: {
  provider: RegisteredProviderDefinition;
  models: ModelDefinition[];
  featureFlags: Record<string, boolean>;
  selectedAuthMethodId?: string;
  status: ConnectionStatus;
}): ProviderUISchema {
  const enabledMethods = getEnabledAuthMethods(options.provider, options.featureFlags);
  const selectedAuthMethodId =
    enabledMethods.find((method) => method.id === options.selectedAuthMethodId)?.id ??
    enabledMethods[0]?.id ??
    options.provider.provider.defaultAuthMethodId;

  const authMethodSection: UISectionSchema = {
    id: 'auth-method-selector',
    title: 'Authentication method',
    description: 'Choose how this provider should connect.',
    badges: [],
    warnings: [],
    fields: [
      {
        key: 'authMethod',
        type: 'radio',
        label: 'Authentication method',
        description: 'Apps can render this as a segmented control, radio group, or dropdown.',
        required: true,
        defaultValue: selectedAuthMethodId,
        validationRules: [],
        options: enabledMethods.map((method) => ({
          value: method.id,
          label: method.label,
          description: method.description,
        })),
        badges: ['schema-driven'],
      },
    ],
  };

  const methodSections = enabledMethods.flatMap((method) =>
    options.provider.methods[method.id].sections.map((section) =>
      cloneSection(section, methodVisibility(method.id)),
    ),
  );

  const modelOptions = options.models
    .filter((model) => model.kind === 'language')
    .map((model) => ({
      value: model.modelId,
      label: model.displayName,
      description: model.tags.join(', '),
    }));

  const modelPickerSection: UISectionSchema = {
    id: 'model-picker',
    title: 'Model picker',
    description: 'Seed model metadata exposed for app-level model pickers.',
    badges: ['catalog'],
    warnings: [],
    fields: [
      {
        key: 'modelId',
        type: 'select',
        label: 'Default model',
        required: false,
        options: modelOptions,
        defaultValue: modelOptions[0]?.value,
        validationRules: [],
        helperText: 'Apps can ignore this section or bind it to connection preferences.',
        badges: ['models'],
      },
    ],
  };

  const actions: UIActionSchema[] = [
    {
      id: 'connect',
      kind: 'connect',
      label: 'Connect',
      variant: 'primary',
    },
    {
      id: 'disconnect',
      kind: 'disconnect',
      label: 'Disconnect',
      variant: 'danger',
      visibility: [
        {
          source: 'connection_status',
          key: 'status',
          operator: 'equals',
          value: 'connected',
        },
      ],
    },
  ];

  const testableMethodIds = enabledMethods
    .filter((method) => method.supportsTesting)
    .map((method) => method.id);

  if (testableMethodIds.length > 0) {
    actions.push({
      id: 'test-connection',
      kind: 'test_connection',
      label: 'Test connection',
      variant: 'secondary',
      helperText: 'Run a provider-specific or local validation check.',
      visibility: [
        {
          source: 'selected_auth_method',
          key: 'authMethod',
          operator: 'in',
          value: testableMethodIds,
        },
      ],
    });
  }

  for (const method of enabledMethods) {
    if (!method.oauth) {
      continue;
    }

    actions.push({
      id: `oauth-launch-${method.id}`,
      kind: 'oauth_launch',
      label: method.oauth.buttonLabel,
      variant: 'primary',
      helperText: 'Launches the provider OAuth flow.',
      oauth: method.oauth,
      experimental: method.experimental,
      warning: method.warning,
      visibility: methodVisibility(method.id),
    });
  }

  const selectedMethod = enabledMethods.find((method) => method.id === selectedAuthMethodId);
  const warnings = [
    ...options.provider.provider.warnings,
    ...(selectedMethod?.warning ? [selectedMethod.warning] : []),
    ...(selectedMethod?.experimental ? ['Selected auth method is experimental.'] : []),
  ];

  const schema: ProviderUISchema = {
    provider: options.provider.provider,
    selectedAuthMethodId,
    status: options.status,
    statusBadge: statusBadge(options.status),
    providerBadges: [...options.provider.provider.badges],
    capabilityBadges: [...options.provider.provider.capabilities],
    warnings,
    sections: [authMethodSection, ...methodSections, modelPickerSection],
    actions,
  };

  return providerUISchemaSchema.parse(schema);
}
