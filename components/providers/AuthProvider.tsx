'use client';

import { SessionProvider } from 'next-auth/react';

/** Makes the session available to client components (navbar, sidebar). */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
