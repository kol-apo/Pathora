import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { homeFor } from '@/lib/auth/guard';

/**
 * Only admins may enter /admin. The session's role is re-read from the
 * database on every request (see the jwt callback in auth.ts), so a change of
 * role takes effect immediately.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/admin');
  if (session.user.role !== 'admin') redirect(homeFor(session.user.role));
  return <>{children}</>;
}
