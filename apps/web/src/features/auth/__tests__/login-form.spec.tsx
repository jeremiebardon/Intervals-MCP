import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LoginForm } from '../components/login-form';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

async function signIn(email: string, password: string) {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginForm', () => {
  it('sends the athlete to the first onboarding step on a valid sign-in', async () => {
    render(<LoginForm />);

    await signIn('alex@stridevolt.test', 'correct-horse');

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/onboarding/availability'),
    );
  });

  it('explains a rejected sign-in without clearing what was typed', async () => {
    render(<LoginForm />);

    await signIn('alex@stridevolt.test', 'wrong-password');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password',
    );
    expect(screen.getByLabelText('Email')).toHaveValue('alex@stridevolt.test');
    expect(push).not.toHaveBeenCalled();
  });

  it('masks the password field', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'type',
      'password',
    );
  });

  it('disables the submit button while the request is in flight', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'alex@stridevolt.test');
    await user.type(screen.getByLabelText('Password'), 'correct-horse');
    await user.click(
      screen.getByRole('button', { name: /signing in|sign in/i }),
    );

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });

  it('offers the account-creation and password-recovery routes from the design', () => {
    render(<LoginForm />);

    expect(
      screen.getByRole('button', { name: 'Create an account' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Forgot password?' }),
    ).toBeInTheDocument();
  });
});
