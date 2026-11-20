import type { Metadata, Viewport } from 'next';
import { Noto_Sans, Noto_Sans_Arabic } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

// One Noto face per script, weights 400 and 600 (spec 09). The hi/ur/bn/ml faces are added on Thursday.
const noto = Noto_Sans({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-noto' });
const notoArabic = Noto_Sans_Arabic({ subsets: ['arabic'], weight: ['400', '600'], variable: '--font-noto-arabic' });

export const metadata: Metadata = {
  title: 'HeatShield',
  description: 'A returning worker is a new worker. HeatShield knows the difference and plans the shift around them.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };

export default function RootLayout({ children }: { children: ReactNode }) {
  // lang/dir default to English; the worker app sets them from the chosen language on the client.
  return (
    <html lang="en" dir="ltr" className={`${noto.variable} ${notoArabic.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
