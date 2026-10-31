import type { Metadata } from 'next';
import './globals.css';
import { GeistSans } from 'geist/font/sans';
import AuthProvider from '@/components/providers/AuthProvider';

export const metadata: Metadata = {
  title: 'Pathora — Find your consultant',
  description:
    'Vetted professionals across Africa, giving free sessions to students. Browse by sector, book a video call.',
  icons: { icon: '/favicon.png' },
};

/**
 * Geist is served from this app through next/font, not from Google Fonts.
 * next/font gives it a fallback font with matching measurements, so text does
 * not move when Geist arrives (with Google Fonts it moved the landing page by
 * 0.17 layout shift on phones), and there is no request to an outside server.
 * It sets the CSS variable --font-geist-sans, used by Tailwind's font-sans.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
