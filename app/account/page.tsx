import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import ConsoleFrame from '@/components/console/ConsoleFrame';
import { ChangePasswordButton, DeleteAccount } from '@/components/account/AccountActions';
import { accountSummary } from '@/lib/db/queries/accountDeletion';

export const metadata = { title: 'Account · Pathora' };
export const dynamic = 'force-dynamic';

const ROLE_LABEL = { student: 'Student', mentor: 'Mentor', admin: 'Admin' } as const;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line">
      <h2 className="border-b border-line px-5 py-4 text-[15px] font-semibold text-ink">{title}</h2>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
  );
}

/** The signed-in person's account: details, password, and withdrawing from the study. */
export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/account');
  const role = session.user.role ?? 'student';
  const summary = await accountSummary(session.user.id);

  return (
    <ConsoleFrame variant={role} title="Account" subtitle="Your details, your password, and your data.">
      <Card title="Your details">
        <dl className="grid gap-3 text-[14px] sm:grid-cols-[180px_1fr]">
          <dt className="text-muted">Name</dt>
          <dd className="text-ink">{session.user.name}</dd>
          <dt className="text-muted">Email</dt>
          <dd className="text-ink">{session.user.email}</dd>
          <dt className="text-muted">Account</dt>
          <dd className="text-ink">{ROLE_LABEL[role]}</dd>
          {summary.participantCode && (
            <>
              <dt className="text-muted">Study participant code</dt>
              <dd className="font-mono text-ink">{summary.participantCode}</dd>
            </>
          )}
        </dl>
      </Card>

      <Card title="Password">
        {summary.hasPassword ? (
          <ChangePasswordButton email={session.user.email ?? ''} />
        ) : (
          <p className="text-[14px] text-muted">You sign in with Google, so there is no Pathora password to change.</p>
        )}
      </Card>

      <Card title={role === 'student' ? 'Withdraw from the study' : 'Delete your account'}>
        {role === 'admin' ? (
          <p className="text-[14px] text-muted">Admin accounts are removed by another admin.</p>
        ) : (
          <>
            <div className="text-[14px] leading-relaxed text-ink">
              <p>
                {role === 'student'
                  ? 'You can stop taking part at any time, without giving a reason. Deleting your account removes:'
                  : 'Deleting your account removes:'}
              </p>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
                <li>your account and profile</li>
                {role === 'student' && (
                  <>
                    <li>
                      your answers and career {summary.discoveryResults === 1 ? 'result' : 'results'} ({summary.discoveryResults}),
                      and the mentors matched to {summary.discoveryResults === 1 ? 'it' : 'them'}
                    </li>
                    <li>your sessions ({summary.bookings}), past and booked</li>
                    <li>everything recorded for the study under your participant code</li>
                    <li>your conversation with Pathy on this device</li>
                  </>
                )}
                {role === 'mentor' && (
                  <>
                    <li>your hours, and every session booked with you</li>
                    <li>your place in students&apos; matches</li>
                  </>
                )}
              </ul>
            </div>
            <DeleteAccount hasPassword={summary.hasPassword} />
          </>
        )}
      </Card>
    </ConsoleFrame>
  );
}
