import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pathora — Find your consultant',
  description:
    'Vetted professionals across Africa, giving free sessions to students. Browse by sector, book a video call.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Geist is not in this Next version's next/font/google registry, so it is
          loaded the same way the design document loads it.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap"
        />
        <style>{`:root { --font-geist: 'Geist'; }`}</style>
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
