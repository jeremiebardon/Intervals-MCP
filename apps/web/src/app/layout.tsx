import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { MswProvider } from '@/mocks/msw-provider';
import { fontVariables } from '@/shared/design-system/fonts';
import { ThemeProvider } from '@/shared/design-system/theme-provider';

import './globals.css';

export const metadata: Metadata = {
  title: 'StrideVolt',
  description: 'Training plans built around your week.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body>
        <ThemeProvider>
          <MswProvider>{children}</MswProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
