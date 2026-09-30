import { render, screen } from '@testing-library/react';

import { Input } from '../input';

describe('Input', () => {
  it('renders a 48px-tall field to match the control rhythm', () => {
    render(<Input aria-label="Email" />);

    expect(screen.getByLabelText('Email')).toHaveClass('h-12');
  });

  it('outlines the field with border-strong so it is visible on a white card', () => {
    render(<Input aria-label="Email" />);

    expect(screen.getByLabelText('Email')).toHaveClass('border-line-strong');
  });

  it('switches the outline to danger once the field is marked invalid', () => {
    render(<Input aria-label="API key" aria-invalid />);

    expect(screen.getByLabelText('API key').className).toContain(
      'aria-invalid:border-danger',
    );
  });

  it('mutes a disabled field instead of hiding its label', () => {
    render(<Input aria-label="Goal pace" disabled />);

    const input = screen.getByLabelText('Goal pace');
    expect(input).toBeDisabled();
    expect(input.className).toContain('disabled:bg-disabled-bg');
  });
});
