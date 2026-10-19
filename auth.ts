import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { z } from 'zod';
import { authConfig } from './auth.config';
import { getSessionState, upsertGoogleUser, verifyCredentials } from '@/lib/db/queries/accounts';
import { DataError } from '@/lib/db/queries/errors';
import dbConnect from '@/lib/db/connect';
import { User } from '@/lib/db/models';

/**
 * Auth.js: email and password, and Google when its keys are configured.
 *
 * Server-only (it talks to MongoDB). Middleware uses auth.config.ts instead.
 * Import `auth` to read the session in server components and API routes.
 */

/** Google sign-in switches on only when both keys are in the environment. */
export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const CredentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = CredentialsSchema.safeParse(raw);
        if (!parsed.success) throw new CredentialsSignin();
        const account = await verifyCredentials(parsed.data.email, parsed.data.password);
        if (!account) throw new CredentialsSignin();
        return account;
      },
    }),
    ...(googleEnabled ? [Google] : []),
  ],
  callbacks: {
    ...authConfig.callbacks,

    /** Google sign-in creates or links the Pathora account. */
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true;
      if (!profile?.email || profile.email_verified === false) return '/signin?error=GoogleEmail';
      try {
        await upsertGoogleUser({
          googleId: account.providerAccountId,
          email: profile.email,
          name: profile.name ?? '',
          image: typeof profile.picture === 'string' ? profile.picture : undefined,
        });
        return true;
      } catch (err) {
        if (err instanceof DataError && err.code === 'ACCOUNT_EXISTS') {
          return '/signin?error=AccountExists';
        }
        throw err;
      }
    },

    /**
     * Put our database id and role in the token. On every later server-side
     * check, re-read the role, so a promotion (make-admin) takes effect
     * without stale permissions lingering in the cookie.
     */
    async jwt({ token, user, account }) {
      if (account?.provider === 'google') {
        await dbConnect();
        const dbUser = await User.findOne({ googleId: account.providerAccountId }).select('_id role').lean();
        if (dbUser) {
          token.uid = String(dbUser._id);
          token.role = dbUser.role;
          token.signedInAt = Date.now();
        }
      } else if (user?.id) {
        token.uid = user.id;
        token.role = user.role;
        // When this sign-in happened. Not the token's own "iat", which is
        // renewed whenever the session cookie is refreshed (middleware does
        // that on every page), so it cannot say how old a sign-in is.
        token.signedInAt = Date.now();
      } else if (token.uid) {
        const state = await getSessionState(token.uid);
        if (!state) return null; // the account was deleted: end the session
        // Signed in before the password was last reset: end the session.
        if (
          state.passwordChangedAt &&
          (typeof token.signedInAt !== 'number' || token.signedInAt < state.passwordChangedAt.getTime())
        ) {
          return null;
        }
        token.role = state.role;
      }
      return token;
    },
  },
});
