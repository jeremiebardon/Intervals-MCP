import type { ReactNode } from 'react';

import { AuthSplitLayout } from '@/features/auth/components/auth-split-layout';
import { OnboardingAside } from '@/features/onboarding/components/onboarding-aside';

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthSplitLayout aside={<OnboardingAside />}>{children}</AuthSplitLayout>
  );
}
