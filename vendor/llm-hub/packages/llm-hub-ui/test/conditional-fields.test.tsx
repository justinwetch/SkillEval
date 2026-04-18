import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectionSchemaRenderer } from '../src/components/ConnectionSchemaRenderer';
import type { LLMHubUIAdapter } from '../src/lib/adapter';
import type { AuthMethodContract, ProviderSchemaContract, ProviderSummaryContract } from '../src/types';

const provider: ProviderSummaryContract = {
  id: 'openrouter',
  name: 'OpenRouter',
  category: 'hybrid',
  connected: false,
  default: false,
  availableAuthMethods: [],
  capabilities: ['tools', 'oauth'],
  warningBadges: [],
  experimental: false,
  uiHints: {
    preferredHostMode: 'sidebar',
    supportedHostModes: ['compact', 'sidebar', 'full_settings_page', 'modal_only'],
    showModelPicker: true,
    supportsCompactStatus: true,
  },
  connection: null,
};

const authMethod: AuthMethodContract = {
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
  hostMode: 'sidebar',
  schema: {
    provider: {
      id: 'openrouter',
      displayName: 'OpenRouter',
      description: 'Demo',
      kind: 'hybrid',
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
    actions: [
      { id: 'connect', kind: 'connect', label: 'Connect', variant: 'primary' },
    ],
  },
  layoutHints: {
    density: 'comfortable',
    chrome: 'sidebar_panel',
    actionsPlacement: 'sticky_footer',
    defaultSectionState: 'expanded',
    emphasizeWarnings: true,
  },
  fieldGroups: [
    {
      id: 'main',
      title: 'Main',
      badges: [],
      warnings: [],
      fields: [
        {
          key: 'apiKey',
          type: 'password',
          label: 'API key',
          required: true,
          validationRules: [],
          badges: [],
        },
        {
          key: 'advancedHeaders',
          type: 'textarea',
          label: 'Advanced headers',
          required: false,
          validationRules: [],
          badges: [],
          visibility: [
            { source: 'field', key: 'showAdvanced', operator: 'equals', value: true },
          ],
        },
        {
          key: 'showAdvanced',
          type: 'checkbox',
          label: 'Show advanced',
          required: false,
          validationRules: [],
          badges: [],
        },
      ],
    },
  ],
  primaryAction: undefined,
  secondaryAction: undefined,
  validationErrors: {},
  successStateText: 'Done.',
  emptyStateText: 'Fill the form.',
  experimentalWarnings: [],
  conditionalVisibility: [],
};

describe('conditional fields', () => {
  it('respects conditional field visibility rules', async () => {
    const adapter = {
      getUISchema: vi.fn(async () => schema),
      connect: vi.fn(),
      disconnect: vi.fn(),
      testConnection: vi.fn(),
      startOAuth: vi.fn(),
      createOAuthCallbackUrl: vi.fn(),
    } as unknown as LLMHubUIAdapter;

    render(
      <ConnectionSchemaRenderer
        adapter={adapter}
        provider={provider}
        authMethod={authMethod}
        hostMode="sidebar"
        onMutation={vi.fn(async () => undefined)}
      />,
    );

    expect(await screen.findByText('API key')).toBeInTheDocument();
    expect(screen.queryByText('Advanced headers')).not.toBeInTheDocument();
  });
});
