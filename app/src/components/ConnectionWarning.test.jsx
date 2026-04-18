import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import ConnectionWarning from './ConnectionWarning';

describe('ConnectionWarning', () => {
  it('renders provider connection language instead of API key language', () => {
    render(
      <MemoryRouter>
        <ConnectionWarning />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No provider connection configured/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to Settings/i })).toHaveAttribute(
      'href',
      '/settings',
    );
  });
});
