import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

/**
 * Protects signed-in areas before the page renders. Uses only the edge-safe
 * config: it reads the session cookie and never touches the database.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ['/dashboard/:path*', '/session/:path*', '/welcome/:path*', '/admin/:path*', '/mentor/:path*'],
};
