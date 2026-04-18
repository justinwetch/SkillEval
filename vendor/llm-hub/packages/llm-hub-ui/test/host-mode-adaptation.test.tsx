import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectionSchemaRenderer } from '../src/components/ConnectionSchemaRenderer';
import type { LLMHubUIAdapter } from '../src/lib/adapter';
import type { AuthMethodContract, ProviderSchemaContract, ProviderSummaryContract } from '../src/types';

const provider: ProviderSummaryContract = {
  id: 'openai',
  name: 'OpenAI',
  category: 'direct_api_key',
  connected: false,
  default: false,
  availableAuthMethods: [],
  capabilities: ['tools'],
  warningBadges: [],
  experimental: false,
  uiHints: {
    preferredHostMode: 'full_settings_page',
    supportedHostModes: ['compact', 'sidebar', 'full_settings_page', 'modal_only'],
    showModelPicker: true,
    supportsCompactStatus: true,
  },
  connection: null,
};

const method: AuthMethodContract = {
  id: 'api_key',
  label: 'API key',
  type: 'api_key',
  uxMode: 'form',
  experimental: false,
  available: true,
  badges: ['manual'],
  schemaSummary: { fieldGroups: [], totalFields: 1, requiredFieldKeys: ['apiKey'] },
};

const schema: ProviderSchemaContract = {
  provider,
  hostMode: 'compact',
  schema: {
    provider: {
      id: 'openai',
      displayName: 'OpenAI',
      description: 'Demo',
      kind: 'direct_api_key',
      authMethods: [],
      defaultAuthMethodId: 'api_key',
      capabilities: ['tools'],
      badges: [],
      warnings: [],
    },
    selectedAuthMethodId: 'api_key',
    status: 'disconnected',
    statusBadge: { label: 'Disconnected', tone: 'neutral' },
    providerBadges: [],
    capabilityBadges: ['tools'],
    warnings: [],
    sections: [],
    actions: [],
  },
  layoutHints: {
    density: 'compact',
    chrome: 'card',
    actionsPlacement: 'inline',
    defaultSectionState: 'collapsed',
    emphasizeWarnings: true,
  },
  fieldGroups: [],
  primaryAction: undefined,
  secondaryAction: undefined,
  validationErrors: {},
  successStateText: 'Done.',
  emptyStateText: 'Choose.',
  experimentalWarnings: [],
  conditionalVisibility: [],
};

describe('host mode adaptation', () => {
  it('applies host mode classes to the renderer root', async () => {
    const adapter = {
      getUISchema: vi.fn(async () => schema),
      connect: vi.fn(),
      disconnect: vi.fn(),
      testConnection: vi.fn(),
      startOAuth: vi.fn(),
      createOAuthCallbackUrl: vi.fn(),
    } as unknown as LLMHubUIAdapter;

    const { container, findByText } = render(
      <ConnectionSchemaRenderer
        adapter={adapter}
        provider={provider}
        authMethod={method}
        hostMode="compact"
        onMutation={vi.fn(async () => undefined)}
      />,
    );

    await findByText('OpenAI setup');
    expect(container.querySelector('.llm-hub-ui-schema-renderer--compact')).toBeTruthy();
  });
});
