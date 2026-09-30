import { render, screen } from '@testing-library/react';

import { StepProgress } from '../step-progress';

function segments() {
  return screen.getByRole('progressbar').querySelectorAll('span');
}

describe('StepProgress', () => {
  it('fills only the first segment on step 1', () => {
    render(<StepProgress step={1} />);

    const [first, second, third] = segments();
    expect(first).toHaveClass('bg-brand');
    expect(second).toHaveClass('bg-line');
    expect(third).toHaveClass('bg-line');
  });

  it('fills every segment up to and including the current step', () => {
    render(<StepProgress step={2} />);

    const [first, second, third] = segments();
    expect(first).toHaveClass('bg-brand');
    expect(second).toHaveClass('bg-brand');
    expect(third).toHaveClass('bg-line');
  });

  it('uses brand rather than lime, which fails 3:1 non-text contrast on white', () => {
    render(<StepProgress step={3} />);

    for (const segment of segments()) {
      expect(segment).not.toHaveClass('bg-achievement');
    }
  });

  it('announces progress to assistive technology', () => {
    render(<StepProgress step={2} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '2');
    expect(bar).toHaveAttribute('aria-valuemax', '3');
  });
});
