import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AuthShell from '@/components/auth/AuthShell';
import ConsentForm from '@/components/auth/ConsentForm';
import { getStudentStatus } from '@/lib/db/queries/accounts';
import {
  CONSENT_AGREEMENT,
  CONSENT_IS_DRAFT,
  CONSENT_POINTS,
  CONSENT_TITLE,
  CONSENT_VERSION,
} from '@/lib/research/consent';

export const metadata = { title: 'Welcome · Pathora' };
export const dynamic = 'force-dynamic';

/**
 * First stop after sign-up, for email and Google alike: research consent.
 * Students who have already consented, and non-students, go straight on.
 */
export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/welcome');
  if (session.user.role !== 'student') redirect('/dashboard');

  const status = await getStudentStatus(session.user.id);
  if (status.consented) redirect('/dashboard');

  const firstName = (session.user.name ?? '').split(' ')[0] || 'there';

  return (
    <AuthShell
      title={`Welcome, ${firstName}`}
      subtitle="One thing before you start. Pathora is part of a research study, so we need your agreement."
    >
      <ConsentForm
        title={CONSENT_TITLE}
        points={CONSENT_POINTS}
        agreement={CONSENT_AGREEMENT}
        version={CONSENT_VERSION}
        isDraft={CONSENT_IS_DRAFT}
      />
    </AuthShell>
  );
}
