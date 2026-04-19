import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthMethodSelector } from '../src/components/AuthMethodSelector';
import type { LLMHubUIAdapter } from '../src/lib/adapter';

describe('AuthMethodSelector', () => {
  it('renders generic auth method metadata and unavailable badges', async () => {
    const adapter = {
      getAuthMethods: vi.fn(async () => ({
        providerId: 'openrouter',
        authMethods: [
          {
            id: 'api_key',
            label: 'API key',
            type: 'api_key',
            uxMode: 'form',
            experimental: false,
            available: true,
            badges: ['manual'],
            schemaSummary: { fieldGroups: [], totalFields: 1, requiredFieldKeys: ['apiKey'] },
          },
          {
            id: 'oauth_pkce',
            label: 'OAuth PKCE',
            type: 'oauth_pkce',
            uxMode: 'oauth_redirect',
            warning: 'OAuth is temporarily unavailable.',
            experimental: true,
            available: false,
            availabilityMessage: 'This auth method is not yet available.',
            badges: ['oauth'],
            schemaSummary: { fieldGroups: [], totalFields: 0, requiredFieldKeys: [] },
          },
        ],
      })),
    } as unknown as LLMHubUIAdapter;

    render(
      <AuthMethodSelector
        adapter={adapter}
        providerId="openrouter"
        selectedMethodId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(await screen.findByText('OAuth PKCE')).toBeInTheDocument();
    expect(screen.getByText('experimental')).toBeInTheDocument();
    expect(screen.getByText('unavailable')).toBeInTheDocument();
  });
});
