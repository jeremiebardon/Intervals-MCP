'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { FormField } from '@/shared/design-system/form-field';
import { Button } from '@/shared/ui/button';

import { login } from '../api';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Controlled rather than read off the form element: jest-fixed-jsdom
  // restores Node's undici FormData, which cannot take an HTMLFormElement.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      router.push('/onboarding/availability');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Something went wrong. Please try again.',
      );
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-1 flex-col gap-6 md:flex-none"
    >
      {/* On mobile the body centres in the space above a bottom-pinned
          footer (Figma 12:11); from tablet up it simply stacks. */}
      <div className="flex flex-1 flex-col justify-center gap-6 md:flex-none md:justify-start">
        <div className="flex flex-col gap-3">
          <p className="mono-label text-brand">Connect</p>
          <h1 className="font-display text-display-lg font-bold text-ink">
            Find your next gear.
          </h1>
          <p className="text-body-lg text-ink-secondary">
            Sign in to sync your training and get a plan built around your week.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <Button
            type="button"
            variant="ghost"
            className="h-12 self-start px-0 pr-6"
          >
            Forgot password?
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-body-sm text-danger-text">
            {error}
          </p>
        )}
      </div>

      {/* 32px from the form block to the footer (Figma 17:282). */}
      <div className="flex flex-col gap-3 pt-2">
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <Button type="button" variant="secondary" className="w-full">
          Create an account
        </Button>
      </div>
    </form>
  );
}
