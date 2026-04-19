import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConnectionSchemaRenderer } from '../src/components/ConnectionSchemaRenderer';
import type { LLMHubUIAdapter } from '../src/lib/adapter';
import type { AuthMethodContract, ProviderSchemaContract, ProviderSummaryContract } from '../src/types';

const provider: ProviderSummaryContract = {
  id: 'codex-bridge',
  name: 'Codex Bridge',
  category: 'oauth',
  connected: false,
  default: false,
  availableAuthMethods: [],
  capabilities: ['tools', 'vision', 'oauth'],
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
      id: 'codex-bridge',
      displayName: 'Codex Bridge',
      description: 'Demo',
      kind: 'oauth',
      authMethods: [],
      defaultAuthMethodId: 'oauth_pkce',
      capabilities: ['tools', 'oauth'],
      badges: [],
      warnings: [],
    },
    selectedAuthMethodId: 'oauth_pkce',
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
  experimentalWarnings: [],
  conditionalVisibility: [],
};

const unavailableMethod: AuthMethodContract = {
  id: 'oauth_pkce',
  label: 'Codex OAuth bridge',
  type: 'oauth_pkce',
  uxMode: 'oauth_redirect',
  description: 'OAuth bridge',
  warning: 'Codex OAuth is unavailable until the local bridge is configured.',
  experimental: false,
  available: false,
  availabilityMessage: 'This auth method is not yet available.',
  badges: ['oauth', 'bridge'],
  schemaSummary: {
    fieldGroups: [],
    totalFields: 0,
    requiredFieldKeys: [],
  },
};

describe('ConnectionSchemaRenderer', () => {
  it('renders unavailable OAuth flows without provider-specific forms', async () => {
    const adapter = {
      getUISchema: vi.fn(async () => schemaResponse),
      disconnect: vi.fn(),
      testConnection: vi.fn(),
      connect: vi.fn(),
      startOAuth: vi.fn(),
      createOAuthCallbackUrl: vi.fn(() => 'http://localhost:3001/oauth/codex-bridge/callback?format=html'),
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
