import { Inter, Roboto_Mono, Space_Grotesk } from 'next/font/google';

/** Editorial impact: display and headings. */
export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

/** Sustained reading: body copy and labels. */
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/** Pace, distance and time — anything that reads as a measurement. */
export const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

export const fontVariables = [
  spaceGrotesk.variable,
  inter.variable,
  robotoMono.variable,
].join(' ');
