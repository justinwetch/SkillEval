import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProviderCard } from '../src/components/ProviderCard';

describe('provider-agnostic rendering behavior', () => {
  it('renders arbitrary provider metadata without custom provider components', () => {
    render(
      <ProviderCard
        provider={{
          id: 'custom-openai-compatible',
          name: 'Custom OpenAI-Compatible',
          category: 'openai_compatible',
          connected: false,
          default: false,
          availableAuthMethods: [
            {
              id: 'openai_compatible',
              label: 'OpenAI-compatible endpoint',
              type: 'openai_compatible',
              uxMode: 'form',
              experimental: false,
              available: true,
            },
          ],
          capabilities: ['tools', 'vision', 'streaming'],
          warningBadges: ['custom'],
          experimental: false,
          uiHints: {
            preferredHostMode: 'full_settings_page',
            supportedHostModes: ['compact', 'sidebar', 'full_settings_page', 'modal_only'],
            showModelPicker: true,
            supportsCompactStatus: true,
          },
          connection: null,
        }}
        selected={false}
        onSelect={() => undefined}
      />,
    );

    expect(screen.getByText('Custom OpenAI-Compatible')).toBeInTheDocument();
    expect(screen.getByText('openai compatible')).toBeInTheDocument();
    expect(screen.getByText('Needs setup')).toBeInTheDocument();
  });
});
