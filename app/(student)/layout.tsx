import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { homeFor } from '@/lib/auth/guard';
import { getStudentStatus } from '@/lib/db/queries/accounts';
import Sidebar from '@/components/layout/Sidebar';

/**
 * The student app: Overview, Mentors, Career Discovery, Opportunities and
 * Sessions, all behind one check. Signed in (middleware sends anyone else to
 * sign in), a student (mentors and admins go to their own console), and
 * agreed to the research consent (everyone else goes to /welcome first).
 */
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');
  if (session.user.role !== 'student') redirect(homeFor(session.user.role));
  if (!(await getStudentStatus(session.user.id)).consented) redirect('/welcome');

  return (
    <div className="min-h-screen bg-white">
      <Sidebar variant="student" />
      <div className="pb-20 lg:ml-[248px] lg:pb-0">{children}</div>
    </div>
  );
}
