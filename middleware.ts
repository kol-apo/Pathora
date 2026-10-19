import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

/**
 * Protects signed-in areas before the page renders. Uses only the edge-safe
 * config: it reads the session cookie and never touches the database.
 */
export default NextAuth(authConfig).auth;

export const config = {
  // Everything except the landing page, sign-in, sign-up and the mentor
  // application intro. Keep in step with PROTECTED in auth.config.ts.
  matcher: [
    '/dashboard/:path*',
    '/explore/:path*',
    '/consultants/:path*',
    '/discover/:path*',
    '/opportunities/:path*',
    '/sessions/:path*',
    '/session/:path*',
    '/welcome/:path*',
    '/admin/:path*',
    '/mentor/:path*',
    '/account/:path*',
  ],
};
