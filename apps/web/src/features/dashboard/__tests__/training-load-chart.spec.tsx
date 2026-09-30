import { render, screen } from '@testing-library/react';

import { TrainingLoadChart } from '../components/training-load-chart';

const weeks = Array.from({ length: 12 }, (_, index) => ({
  week: index + 1,
  value: (index + 1) * 5,
}));

describe('TrainingLoadChart', () => {
  it('draws one bar per week', () => {
    render(<TrainingLoadChart weeks={weeks} deltaLabel="+8.4%" />);

    expect(screen.getAllByRole('listitem')).toHaveLength(12);
  });

  it('scales bar height against the largest week, not an absolute maximum', () => {
    render(
      <TrainingLoadChart
        weeks={[
          { week: 1, value: 25 },
          { week: 2, value: 50 },
        ]}
        deltaLabel="+1%"
      />,
    );

    const [first, second] = screen
      .getAllByRole('listitem')
      .map((item) => item.querySelector('span'));

    expect(first).toHaveStyle({ height: '50%' });
    expect(second).toHaveStyle({ height: '100%' });
  });

  it('highlights only the most recent week in the achievement colour', () => {
    render(<TrainingLoadChart weeks={weeks} deltaLabel="+8.4%" />);

    const bars = screen
      .getAllByRole('listitem')
      .map((item) => item.querySelector('span'));

    expect(bars.at(-1)).toHaveClass('bg-achievement');
    expect(
      bars.slice(0, -1).every((bar) => bar?.classList.contains('bg-brand/60')),
    ).toBe(true);
  });

  it('gives every bar an accessible label rather than relying on colour alone', () => {
    render(<TrainingLoadChart weeks={weeks} deltaLabel="+8.4%" />);

    expect(
      screen.getByRole('listitem', { name: 'Week 12: 60' }),
    ).toBeInTheDocument();
  });

  it('renders nothing but an empty state when there is no data yet', () => {
    render(<TrainingLoadChart weeks={[]} deltaLabel="0%" />);

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText(/no training load yet/i)).toBeInTheDocument();
  });
});
