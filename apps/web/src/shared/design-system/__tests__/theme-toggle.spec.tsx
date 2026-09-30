import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeToggle } from '../theme-toggle';

const setTheme = jest.fn();
let currentTheme = 'light';

jest.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: currentTheme, setTheme }),
}));

function build() {
  const user = userEvent.setup();
  render(<ThemeToggle />);
  return { user, toggle: screen.getByRole('button') };
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    currentTheme = 'light';
  });

  it('exposes an accessible name so it is reachable without seeing the icon', () => {
    const { toggle } = build();

    expect(toggle).toHaveAccessibleName(/dark mode/i);
  });

  it('switches to dark when the current theme is light', async () => {
    const { user, toggle } = build();

    await user.click(toggle);

    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches back to light when the current theme is dark', async () => {
    currentTheme = 'dark';
    const { user, toggle } = build();

    await user.click(toggle);

    expect(setTheme).toHaveBeenCalledWith('light');
  });
});
