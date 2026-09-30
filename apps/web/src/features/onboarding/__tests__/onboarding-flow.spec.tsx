import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VALID_INTERVALS_KEY } from '@/mocks/db';

import { AvailabilityStep } from '../components/availability-step';
import { DoneStep } from '../components/done-step';
import { IntervalsStep } from '../components/intervals-step';
import { SportStep } from '../components/sport-step';

const push = jest.fn();
const back = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back }),
}));

describe('onboarding flow', () => {
  it('carries the answers from every step through to the summary', async () => {
    const user = userEvent.setup();

    // Step 1 — availability.
    const availability = render(<AvailabilityStep />);
    await user.click(
      await screen.findByRole('button', { name: 'Mon Evening' }),
    );
    await user.click(screen.getByRole('button', { name: 'Wed Evening' }));
    await user.click(screen.getByRole('button', { name: 'Sat Morning' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/onboarding/sport'));
    availability.unmount();

    // Step 2 — sport.
    const sport = render(<SportStep />);
    await user.click(await screen.findByRole('checkbox', { name: /Running/ }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/onboarding/intervals'),
    );
    sport.unmount();

    // Step 3 — Intervals.icu.
    const intervals = render(<IntervalsStep />);
    await user.type(
      screen.getByLabelText('Intervals.icu API key'),
      VALID_INTERVALS_KEY,
    );
    await user.click(screen.getByRole('button', { name: 'Connect & finish' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/onboarding/done'));
    intervals.unmount();

    // Done — the summary reflects what was actually chosen.
    render(<DoneStep />);
    expect(await screen.findByText('3 slots · 3 days')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('keeps Continue disabled until at least one slot is selected', async () => {
    render(<AvailabilityStep />);

    expect(
      await screen.findByRole('button', { name: 'Continue' }),
    ).toBeDisabled();

    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Tue Noon' }));

    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('counts distinct days rather than slots in the availability hint', async () => {
    const user = userEvent.setup();
    render(<AvailabilityStep />);

    await user.click(
      await screen.findByRole('button', { name: 'Mon Morning' }),
    );
    await user.click(screen.getByRole('button', { name: 'Mon Evening' }));

    expect(screen.getByText('2 slots selected · 1 day')).toBeInTheDocument();
  });

  it('explains a rejected Intervals.icu key and stays on the step', async () => {
    const user = userEvent.setup();
    render(<IntervalsStep />);

    await user.type(
      screen.getByLabelText('Intervals.icu API key'),
      'not-a-key',
    );
    await user.click(screen.getByRole('button', { name: 'Connect & finish' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't verify this key. Check that you copied all of it.",
    );
    expect(push).not.toHaveBeenCalledWith('/onboarding/done');
  });

  it('keeps Connect & finish disabled while the key field is empty', () => {
    render(<IntervalsStep />);

    expect(
      screen.getByRole('button', { name: 'Connect & finish' }),
    ).toBeDisabled();
  });
});
