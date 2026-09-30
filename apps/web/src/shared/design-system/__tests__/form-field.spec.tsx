import { render, screen } from '@testing-library/react';

import { FormField } from '../form-field';

describe('FormField', () => {
  it('associates the visible label with the control', () => {
    render(<FormField label="Email" name="email" />);

    expect(screen.getByLabelText('Email')).toBe(
      screen.getByRole('textbox', { name: 'Email' }),
    );
  });

  it('keeps the label visible rather than collapsing it into a placeholder', () => {
    render(<FormField label="Intervals.icu API key" name="apiKey" />);

    expect(screen.getByText('Intervals.icu API key')).toBeVisible();
  });

  it('reads out helper text as the field description', () => {
    render(
      <FormField
        label="Intervals.icu API key"
        name="apiKey"
        helper="Stored securely. You can revoke it anytime in Intervals.icu."
      />,
    );

    expect(
      screen.getByLabelText('Intervals.icu API key'),
    ).toHaveAccessibleDescription(
      'Stored securely. You can revoke it anytime in Intervals.icu.',
    );
  });

  it('marks the control invalid and announces the error when one is given', () => {
    render(
      <FormField
        label="Intervals.icu API key"
        name="apiKey"
        error="We couldn't verify this key. Check that you copied all of it."
      />,
    );

    const input = screen.getByLabelText('Intervals.icu API key');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't verify this key. Check that you copied all of it.",
    );
  });

  it('prefers the error over the helper when both are supplied', () => {
    render(
      <FormField
        label="Intervals.icu API key"
        name="apiKey"
        helper="Stored securely."
        error="That key did not work."
      />,
    );

    expect(screen.queryByText('Stored securely.')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'That key did not work.',
    );
  });
});
