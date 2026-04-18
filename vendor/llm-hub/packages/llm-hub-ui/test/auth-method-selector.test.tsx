import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthMethodSelector } from '../src/components/AuthMethodSelector';
import type { LLMHubUIAdapter } from '../src/lib/adapter';

describe('AuthMethodSelector', () => {
  it('renders unofficial Google OAuth through the generic method list', async () => {
    const adapter = {
      getAuthMethods: vi.fn(async () => ({
        providerId: 'gemini',
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
            id: 'oauth_unofficial',
            label: 'Unofficial Google OAuth',
            type: 'oauth_pkce',
            uxMode: 'oauth_redirect',
            warning: 'Unofficial experimental option.',
            experimental: true,
            available: false,
            availabilityMessage: 'This auth method is not yet available.',
            badges: ['oauth', 'unofficial'],
            schemaSummary: { fieldGroups: [], totalFields: 0, requiredFieldKeys: [] },
          },
        ],
      })),
    } as unknown as LLMHubUIAdapter;

    render(
      <AuthMethodSelector
        adapter={adapter}
        providerId="gemini"
        selectedMethodId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(await screen.findByText('Unofficial Google OAuth')).toBeInTheDocument();
    expect(screen.getByText('experimental')).toBeInTheDocument();
    expect(screen.getByText('unavailable')).toBeInTheDocument();
  });
});
