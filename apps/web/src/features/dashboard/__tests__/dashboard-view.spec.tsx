import { render, screen } from '@testing-library/react';

import { DashboardView } from '../components/dashboard-view';

jest.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: jest.fn() }),
}));

describe('DashboardView', () => {
  it('shows a loading state before the week has arrived', () => {
    render(<DashboardView />);

    expect(screen.getByText(/loading your week/i)).toBeInTheDocument();
  });

  it('greets the athlete and dates the week', async () => {
    render(<DashboardView />);

    expect(
      await screen.findByRole('heading', { name: 'Good morning, Alex' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Saturday, September 26 · Build week 8'),
    ).toBeInTheDocument();
  });

  it("leads with today's key session and its target numbers", async () => {
    render(<DashboardView />);

    expect(
      await screen.findByRole('heading', { name: 'Progressive tempo' }),
    ).toBeInTheDocument();
    expect(screen.getByText('10.0')).toBeInTheDocument();
    expect(screen.getByText('04:48')).toBeInTheDocument();
  });

  it('renders all four headline metrics', async () => {
    render(<DashboardView />);

    await screen.findByText('Weekly distance');
    for (const label of [
      'Weekly distance',
      'Average pace',
      'Heart load',
      'Consistency',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('lists the next three sessions with their emphasis tags', async () => {
    render(<DashboardView />);

    expect(await screen.findByText('Easy aerobic')).toBeInTheDocument();
    expect(screen.getByText('Long run')).toBeInTheDocument();
    expect(screen.getByText('KEY')).toBeInTheDocument();
  });

  it('surfaces the recovery score and its underlying signals', async () => {
    render(<DashboardView />);

    expect(await screen.findByText('86')).toBeInTheDocument();
    expect(screen.getByText('8:12')).toBeInTheDocument();
    expect(screen.getByText('71')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
  });

  it('marks the current section in the sidebar navigation', async () => {
    render(<DashboardView />);

    expect(
      await screen.findByRole('link', { name: 'Dashboard' }),
    ).toHaveAttribute('aria-current', 'page');
  });
});
