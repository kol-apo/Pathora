import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import type { UserRole } from '@/lib/db/models/User';

/**
 * For API routes: the signed-in user's id if they have the required role,
 * otherwise a ready-made 401 or 403 response to return.
 */
export async function requireRole(
  role: UserRole,
): Promise<{ userId: string } | { response: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: 'Sign in first.' }, { status: 401 }) };
  }
  if (session.user.role !== role) {
    return { response: NextResponse.json({ error: 'You do not have access to this.' }, { status: 403 }) };
  }
  return { userId: session.user.id };
}

/** Where each role's home is. */
export function homeFor(role: UserRole | undefined): string {
  return role === 'admin' ? '/admin' : role === 'mentor' ? '/mentor' : '/dashboard';
}
