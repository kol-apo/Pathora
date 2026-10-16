import type { DefaultSession } from 'next-auth';
import type { UserRole } from '@/lib/db/models/User';

/** The session carries our database user id and role, not just name and email. */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession['user'];
  }

  interface User {
    role?: UserRole;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    uid?: string;
    role?: UserRole;
  }
}
