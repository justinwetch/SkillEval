import { z, type ZodType } from 'zod';

import type {
  JSONValue,
  ProviderAuthMethod,
  ProviderDefinition,
  UIFieldSchema,
  UISectionSchema,
} from '../types';
import type { RegisteredProviderDefinition } from './definitions';

function textField(
  overrides: Partial<UIFieldSchema> & Pick<UIFieldSchema, 'key' | 'label'>,
): UIFieldSchema {
  return {
    key: overrides.key,
    type: overrides.type ?? 'text',
    label: overrides.label,
    description: overrides.description,
    placeholder: overrides.placeholder,
    helperText: overrides.helperText,
    required: overrides.required ?? true,
    defaultValue: overrides.defaultValue,
    secret: overrides.secret,
    masked: overrides.masked,
    validationRules: overrides.validationRules ?? [],
    options: overrides.options,
    visibility: overrides.visibility,
    badges: overrides.badges ?? [],
    warning: overrides.warning,
    experimental: overrides.experimental,
  };
}

function section(
  id: string,
  title: string,
  fields: UIFieldSchema[],
  description?: string,
): UISectionSchema {
  return {
    id,
    title,
    description,
    badges: [],
    warnings: [],
    fields,
  };
}

function payloadSchema(schema: z.ZodObject<any>): ZodType<Record<string, JSONValue>> {
  return schema as unknown as ZodType<Record<string, JSONValue>>;
}

const apiKeyField = textField({
  key: 'apiKey',
  label: 'API key',
  type: 'password',
  placeholder: 'Paste your provider API key',
  helperText: 'Stored locally and masked in public views.',
  secret: true,
  masked: true,
  validationRules: [{ type: 'min_length', value: 8, message: 'API key looks too short.' }],
  badges: ['secret'],
});

const callbackUrlField = textField({
  key: 'callbackUrl',
  label: 'Callback URL',
  type: 'hidden',
  helperText: 'App-provided OAuth callback URL.',
  validationRules: [{ type: 'url', message: 'Callback URL must be a valid URL.' }],
});

function apiKeyMethod(
  providerLabel: string,
  extras?: Partial<ProviderAuthMethod>,
): { method: ProviderAuthMethod; sections: UISectionSchema[]; inputSchema: ZodType<Record<string, JSONValue>> } {
  return {
    method: {
      id: 'api_key',
      kind: 'api_key',
      label: 'API key',
      description: `Connect ${providerLabel} with a direct API key.`,
      badges: ['manual'],
      supportsTesting: true,
      ...extras,
    },
    sections: [section('api-key', 'API key', [apiKeyField])],
    inputSchema: payloadSchema(
      z.object({
        apiKey: z.string().trim().min(1),
      }),
    ),
  };
}

const directProviders = [
  {
    id: 'openai',
    displayName: 'OpenAI',
    description: 'Official OpenAI provider using direct API key authentication.',
    website: 'https://platform.openai.com',
    kind: 'direct_api_key' as const,
    capabilities: ['tools', 'vision', 'streaming', 'reasoning', 'embeddings'] as const,
    badges: ['official'],
    warnings: [],
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic',
    description: 'Official Anthropic provider using direct API key authentication.',
    website: 'https://www.anthropic.com',
    kind: 'direct_api_key' as const,
    capabilities: ['tools', 'vision', 'streaming', 'reasoning'] as const,
    badges: ['official'],
    warnings: [],
  },
  {
    id: 'gemini',
    displayName: 'Gemini',
    description: 'Google Generative AI provider using API key authentication.',
    website: 'https://ai.google.dev',
    kind: 'direct_api_key' as const,
    capabilities: ['tools', 'vision', 'streaming', 'reasoning', 'embeddings'] as const,
    badges: ['official'],
    warnings: [],
  },
] satisfies Array<Omit<ProviderDefinition, 'authMethods' | 'defaultAuthMethodId'>>;

const codexBridgeOAuthMethod: ProviderAuthMethod = {
  id: 'oauth_pkce',
  kind: 'oauth_pkce',
  label: 'Codex OAuth bridge',
  description:
    'Connect through the local Codex OAuth bridge and store its OpenAI-compatible API key locally.',
  badges: ['oauth', 'bridge'],
  supportsTesting: true,
  warning:
    'Set LLM_HUB_CODEX_BRIDGE_AUTH_URL and LLM_HUB_CODEX_BRIDGE_TOKEN_URL in app/.env.local to enable Codex OAuth.',
  oauth: {
    buttonLabel: 'Connect Codex',
    authorizationUrl: process.env.LLM_HUB_CODEX_BRIDGE_AUTH_URL ?? '',
    tokenExchangeUrl: process.env.LLM_HUB_CODEX_BRIDGE_TOKEN_URL ?? '',
    launchMode: 'redirect',
    codeChallengeMethod: 'S256',
    callbackParamKeys: ['code', 'state'],
  },
};

export const seedProviders: RegisteredProviderDefinition[] = [
  ...directProviders.map((providerBase) => {
    const apiKey = apiKeyMethod(providerBase.displayName);
    const authMethods = [apiKey.method];
    const methods = {
      [apiKey.method.id]: {
        method: apiKey.method,
        inputSchema: apiKey.inputSchema,
        sections: apiKey.sections,
        secretFieldKeys: ['apiKey'],
      },
    };

    return {
      provider: {
        ...providerBase,
        authMethods,
        defaultAuthMethodId: apiKey.method.id,
      },
      methods,
    } satisfies RegisteredProviderDefinition;
  }),
  {
    provider: {
      id: 'codex-bridge',
      displayName: 'Codex Bridge',
      description:
        'Local OAuth PKCE bridge for Codex-backed OpenAI-compatible chat models.',
      kind: 'oauth',
      authMethods: [codexBridgeOAuthMethod],
      defaultAuthMethodId: 'oauth_pkce',
      capabilities: ['tools', 'vision', 'streaming', 'reasoning', 'oauth'],
      badges: ['bridge'],
      warnings: [],
    },
    methods: {
      oauth_pkce: {
        method: codexBridgeOAuthMethod,
        inputSchema: payloadSchema(
          z.object({
            callbackUrl: z.string().url(),
          }),
        ),
        sections: [
          section(
            'codex-bridge-oauth',
            'OAuth connection',
            [callbackUrlField],
            'Launches the existing Codex bridge OAuth flow instead of collecting a manual API key.',
          ),
        ],
        secretFieldKeys: ['apiKey'],
      },
    },
  },
  {
    provider: {
      id: 'openrouter',
      displayName: 'OpenRouter',
      description: 'Unified router for many LLM providers with API key and OAuth PKCE support.',
      website: 'https://openrouter.ai',
      kind: 'hybrid',
      authMethods: [
        apiKeyMethod('OpenRouter').method,
        {
          id: 'oauth_pkce',
          kind: 'oauth_pkce',
          label: 'OAuth PKCE',
          description: 'Connect with a user-controlled OpenRouter key via OAuth PKCE.',
          badges: ['oauth'],
          supportsTesting: true,
          oauth: {
            buttonLabel: 'Connect with OpenRouter',
            authorizationUrl: 'https://openrouter.ai/auth',
            tokenExchangeUrl: 'https://openrouter.ai/api/v1/auth/keys',
            launchMode: 'redirect',
            codeChallengeMethod: 'S256',
            callbackParamKeys: ['code', 'state'],
          },
        },
      ],
      defaultAuthMethodId: 'api_key',
      capabilities: ['tools', 'vision', 'streaming', 'reasoning', 'oauth'],
      badges: ['router'],
      warnings: [],
    },
    methods: {
      api_key: {
        method: apiKeyMethod('OpenRouter').method,
        inputSchema: apiKeyMethod('OpenRouter').inputSchema,
        sections: apiKeyMethod('OpenRouter').sections,
        secretFieldKeys: ['apiKey'],
      },
      oauth_pkce: {
        method: {
          id: 'oauth_pkce',
          kind: 'oauth_pkce',
          label: 'OAuth PKCE',
          description: 'Launch an OAuth PKCE flow to obtain a user-controlled OpenRouter key.',
          badges: ['oauth'],
          supportsTesting: true,
          oauth: {
            buttonLabel: 'Connect with OpenRouter',
            authorizationUrl: 'https://openrouter.ai/auth',
            tokenExchangeUrl: 'https://openrouter.ai/api/v1/auth/keys',
            launchMode: 'redirect',
            codeChallengeMethod: 'S256',
            callbackParamKeys: ['code', 'state'],
          },
        },
        inputSchema: payloadSchema(
          z.object({
            callbackUrl: z.string().url(),
          }),
        ),
        sections: [
          section(
            'oauth-pkce',
            'OAuth connection',
            [callbackUrlField],
            'Launches a browser-based OAuth PKCE flow instead of collecting a manual API key.',
          ),
        ],
        secretFieldKeys: ['apiKey'],
      },
    },
  },
  {
    provider: {
      id: 'ollama',
      displayName: 'Ollama',
      description: 'Local Ollama provider with optional custom base URL and headers.',
      website: 'https://ollama.com',
      kind: 'local',
      authMethods: [
        {
          id: 'local',
          kind: 'local',
          label: 'Local connection',
          description: 'Connect to a local or proxied Ollama instance.',
          badges: ['local'],
          supportsTesting: true,
        },
      ],
      defaultAuthMethodId: 'local',
      capabilities: ['streaming', 'reasoning', 'embeddings', 'local'],
      badges: ['local-first'],
      warnings: [],
    },
    methods: {
      local: {
        method: {
          id: 'local',
          kind: 'local',
          label: 'Local connection',
          description: 'Connect to an Ollama endpoint running locally or behind a proxy.',
          badges: ['local'],
          supportsTesting: true,
        },
        inputSchema: payloadSchema(
          z.object({
            baseURL: z.string().url(),
            headersJson: z.string().optional().default(''),
          }),
        ),
        sections: [
          section('ollama-local', 'Endpoint', [
            textField({
              key: 'baseURL',
              label: 'Base URL',
              placeholder: 'http://localhost:11434/api',
              helperText: 'Defaults to the Ollama local API endpoint.',
              defaultValue: 'http://localhost:11434/api',
              validationRules: [{ type: 'url', message: 'Base URL must be valid.' }],
              badges: ['endpoint'],
            }),
            textField({
              key: 'headersJson',
              label: 'Optional headers JSON',
              type: 'textarea',
              required: false,
              placeholder: '{"Authorization":"Bearer token"}',
              helperText: 'Optional headers for proxy deployments.',
              validationRules: [{ type: 'json', message: 'Headers must be valid JSON.' }],
              badges: ['advanced'],
            }),
          ])
        ],
        secretFieldKeys: [],
      },
    },
  },
  {
    provider: {
      id: 'custom-openai-compatible',
      displayName: 'Custom OpenAI-Compatible',
      description: 'Bring your own OpenAI-compatible endpoint with optional headers and model prefixing.',
      kind: 'openai_compatible',
      authMethods: [
        {
          id: 'openai_compatible',
          kind: 'openai_compatible',
          label: 'OpenAI-compatible endpoint',
          description: 'Configure a custom endpoint, API key, and optional transport headers.',
          badges: ['custom-endpoint'],
          supportsTesting: true,
        },
      ],
      defaultAuthMethodId: 'openai_compatible',
      capabilities: ['tools', 'vision', 'streaming', 'reasoning', 'embeddings'],
      badges: ['custom'],
      warnings: [],
    },
    methods: {
      openai_compatible: {
        method: {
          id: 'openai_compatible',
          kind: 'openai_compatible',
          label: 'OpenAI-compatible endpoint',
          description: 'Configure a custom OpenAI-compatible endpoint.',
          badges: ['custom-endpoint'],
          supportsTesting: true,
        },
        inputSchema: payloadSchema(
          z.object({
            baseURL: z.string().url(),
            apiKey: z.string().trim().min(1),
            headersJson: z.string().optional().default(''),
            modelPrefix: z.string().optional().default(''),
          }),
        ),
        sections: [
          section('custom-endpoint', 'Connection', [
            textField({
              key: 'baseURL',
              label: 'Base URL',
              placeholder: 'https://api.example.com/v1',
              helperText: 'Must point to an OpenAI-compatible API root.',
              validationRules: [{ type: 'url', message: 'Base URL must be valid.' }],
              badges: ['endpoint'],
            }),
            apiKeyField,
          ]),
          section('custom-endpoint-advanced', 'Advanced', [
            textField({
              key: 'headersJson',
              label: 'Optional headers JSON',
              type: 'textarea',
              required: false,
              placeholder: '{"x-tenant":"demo"}',
              helperText: 'Added to every request after the Authorization header.',
              validationRules: [{ type: 'json', message: 'Headers must be valid JSON.' }],
              badges: ['advanced'],
            }),
            textField({
              key: 'modelPrefix',
              label: 'Optional model prefix',
              required: false,
              placeholder: 'tenant-a/',
              helperText: 'Prepended for runtime model lookups outside the seed catalog.',
              badges: ['advanced'],
            }),
          ]),
        ],
        secretFieldKeys: ['apiKey'],
      },
    },
  },
];
