import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AvailabilityGrid } from '../components/availability-grid';

function build(selected: string[] = []) {
  const onChange = jest.fn();
  const user = userEvent.setup();
  render(<AvailabilityGrid selected={selected} onChange={onChange} />);
  return { user, onChange };
}

describe('AvailabilityGrid', () => {
  it('offers three slots for each of the seven weekdays', () => {
    build();

    expect(screen.getAllByRole('button')).toHaveLength(21);
  });

  it('labels every slot with both its day and time so it is unambiguous', () => {
    build();

    expect(
      screen.getByRole('button', { name: 'Mon Morning' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sun Evening' }),
    ).toBeInTheDocument();
  });

  it('adds a slot that was not previously selected', async () => {
    const { user, onChange } = build(['Mon:Evening']);

    await user.click(screen.getByRole('button', { name: 'Wed Noon' }));

    expect(onChange).toHaveBeenCalledWith(['Mon:Evening', 'Wed:Noon']);
  });

  it('removes a slot that was already selected', async () => {
    const { user, onChange } = build(['Mon:Evening', 'Wed:Noon']);

    await user.click(screen.getByRole('button', { name: 'Mon Evening' }));

    expect(onChange).toHaveBeenCalledWith(['Wed:Noon']);
  });

  it('marks selected slots as pressed for assistive technology', () => {
    build(['Sat:Morning']);

    expect(screen.getByRole('button', { name: 'Sat Morning' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Sat Noon' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('keeps each weekday on its own row', () => {
    build();

    const monday = screen.getByRole('group', { name: 'Mon' });
    expect(within(monday).getAllByRole('button')).toHaveLength(3);
  });
});
