import { AuthSplitLayout } from '@/features/auth/components/auth-split-layout';
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <AuthSplitLayout
      aside={
        <div className="flex flex-col gap-6">
          <p className="mono-label text-brand">Connect</p>
          <h2 className="font-display text-display font-bold text-ink">
            Train with intent.
          </h2>
          <p className="text-body-lg text-ink-secondary">
            Sign in to sync your training and get a plan built around your week.
          </p>
        </div>
      }
    >
      <LoginForm />
    </AuthSplitLayout>
  );
}
