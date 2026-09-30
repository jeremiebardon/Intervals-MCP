import { render, screen } from '@testing-library/react';

import { Button } from '../button';

describe('Button', () => {
  it('renders a 48px-tall control, clearing the 44px minimum touch target', () => {
    render(<Button>Sign in</Button>);

    expect(screen.getByRole('button')).toHaveClass('h-12');
  });

  it('carries the brand fill and on-brand label by default', () => {
    render(<Button>Sign in</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-brand');
    expect(button).toHaveClass('text-on-brand');
  });

  it('gives the secondary variant a surface fill and a visible border', () => {
    render(<Button variant="secondary">Create an account</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-surface');
    expect(button).toHaveClass('border');
  });

  it('renders the ghost variant without fill or border', () => {
    render(<Button variant="ghost">Forgot password?</Button>);

    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('bg-brand');
    expect(button).not.toHaveClass('border');
  });

  it('keeps a disabled control non-interactive and visibly muted', () => {
    render(<Button disabled>Connect &amp; finish</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.className).toContain('disabled:bg-disabled-bg');
    expect(button.className).toContain('disabled:text-disabled-fg');
  });
});
