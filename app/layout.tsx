import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/providers/AuthProvider';

export const metadata: Metadata = {
  title: 'Pathora — Find your consultant',
  description:
    'Vetted professionals across Africa, giving free sessions to students. Browse by sector, book a video call.',
  icons: { icon: '/favicon.png' },
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
        {/* Set as raw HTML: as a text child, React escapes the quotes differently
            on the server and the client, which breaks hydration on every page. */}
        <style dangerouslySetInnerHTML={{ __html: ":root { --font-geist: 'Geist'; }" }} />
      </head>
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
