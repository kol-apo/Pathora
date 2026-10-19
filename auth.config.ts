import type { NextAuthConfig } from 'next-auth';
import type { UserRole } from '@/lib/db/models/User';

/**
 * The part of the Auth.js configuration that is safe to run in middleware.
 *
 * Middleware runs on the edge runtime, where Mongoose cannot run, so nothing
 * here may touch the database. Providers and the database lookups live in
 * auth.ts; this file only reads the signed session token.
 */

/** Pages that need a signed-in user. */
const PROTECTED = [
  '/dashboard',
  '/explore',
  '/consultants',
  '/discover',
  '/opportunities',
  '/sessions',
  '/session',
  '/welcome',
  '/admin',
  '/mentor',
  '/account',
];

export const authConfig = {
  pages: {
    signIn: '/signin',
  },
  // Sessions are signed tokens in a cookie (JWT). Required for email and
  // password sign-in, and it means no session collection in the database.
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    /**
     * Runs in middleware for every protected page: only checks that someone is
     * signed in. Roles are checked by the /admin and /mentor layouts, which read
     * the current role from the database. The role in this cookie can be out of
     * date (someone who just became a mentor), so it must not decide access.
     */
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const needsLogin = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
      return !needsLogin || !!auth?.user; // false: Auth.js redirects to /signin with a callbackUrl
    },
    /** Copy the database id and role from the token onto the session. */
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      if (token.role) session.user.role = token.role as UserRole;
      return session;
    },
  },
} satisfies NextAuthConfig;
