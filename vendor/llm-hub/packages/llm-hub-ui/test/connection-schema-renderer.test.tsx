import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectionSchemaRenderer } from '../src/components/ConnectionSchemaRenderer';
import type { LLMHubUIAdapter } from '../src/lib/adapter';
import type { AuthMethodContract, ProviderSchemaContract, ProviderSummaryContract } from '../src/types';

const provider: ProviderSummaryContract = {
  id: 'gemini',
  name: 'Gemini',
  category: 'direct_api_key',
  connected: false,
  default: false,
  availableAuthMethods: [],
  capabilities: ['tools', 'vision'],
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

const schemaResponse: ProviderSchemaContract = {
  provider,
  hostMode: 'full_settings_page',
  schema: {
    provider: {
      id: 'gemini',
      displayName: 'Gemini',
      description: 'Demo',
      kind: 'direct_api_key',
      authMethods: [],
      defaultAuthMethodId: 'oauth_unofficial',
      capabilities: ['tools'],
      badges: [],
      warnings: [],
    },
    selectedAuthMethodId: 'oauth_unofficial',
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
    chrome: 'page',
    actionsPlacement: 'footer',
    defaultSectionState: 'expanded',
    emphasizeWarnings: true,
  },
  fieldGroups: [
    {
      id: 'notice',
      title: 'Notice',
      description: 'This section proves the renderer is schema-driven.',
      badges: [],
      warnings: ['Unavailable preview. The backend intentionally does not complete this flow yet.'],
      fields: [],
    },
  ],
  primaryAction: undefined,
  secondaryAction: undefined,
  validationErrors: {},
  successStateText: 'Connected.',
  emptyStateText: 'Choose a method.',
  experimentalWarnings: ['Unofficial experimental option. Not implemented yet and should be treated as preview-only UI.'],
  conditionalVisibility: [],
};

const unavailableMethod: AuthMethodContract = {
  id: 'oauth_unofficial',
  label: 'Unofficial Google OAuth',
  type: 'oauth_pkce',
  uxMode: 'oauth_redirect',
  description: 'Experimental placeholder',
  warning: 'Unofficial experimental option. Not implemented yet and should be treated as preview-only UI.',
  experimental: true,
  available: false,
  availabilityMessage: 'This auth method is not yet available.',
  badges: ['oauth', 'unofficial'],
  schemaSummary: {
    fieldGroups: [],
    totalFields: 0,
    requiredFieldKeys: [],
  },
};

describe('ConnectionSchemaRenderer', () => {
  it('renders unavailable experimental OAuth flows without provider-specific forms', async () => {
    const adapter = {
      getUISchema: vi.fn(async () => schemaResponse),
      disconnect: vi.fn(),
      testConnection: vi.fn(),
      connect: vi.fn(),
      startOAuth: vi.fn(),
      createOAuthCallbackUrl: vi.fn(() => 'http://localhost:3001/oauth/gemini/callback?format=html'),
    } as unknown as LLMHubUIAdapter;

    render(
      <ConnectionSchemaRenderer
        adapter={adapter}
        provider={provider}
        authMethod={unavailableMethod}
        hostMode="full_settings_page"
        onMutation={vi.fn(async () => undefined)}
      />,
    );

    expect(await screen.findByText('Unavailable method')).toBeInTheDocument();
    expect(screen.getByText(/not yet available/i)).toBeInTheDocument();
    expect(screen.getByText(/no manual fields are required/i)).toBeInTheDocument();
  });
});
