import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarDays, HeartHandshake, ShieldCheck } from 'lucide-react';
import { auth } from '@/auth';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MentorApplicationForm from '@/components/console/MentorApplicationForm';
import { getMentorSelf } from '@/lib/db/queries/mentorConsole';

export const metadata = { title: 'Become a mentor · Pathora' };
export const dynamic = 'force-dynamic';

const RETURN = encodeURIComponent('/become-a-mentor');

export default async function BecomeAMentorPage() {
  const session = await auth();
  const user = session?.user;
  if (user?.id && (await getMentorSelf(user.id))) redirect('/mentor');

  return (
    <>
      <Navbar />
      <main className="mx-auto grid max-w-[1200px] gap-12 px-5 py-14 md:px-10 lg:grid-cols-[0.8fr_1.2fr]">
        <section>
          <p className="flex items-center gap-2.5 text-micro font-semibold uppercase text-navy">
            <span className="h-[3px] w-6 rounded-full bg-sky" aria-hidden="true" />
            For professionals
          </p>
          <h1 className="mt-4 text-[34px] font-bold leading-[1.1] tracking-[-0.03em] text-ink md:text-[42px]">
            Give one free session a month. Change a student’s trajectory.
          </h1>
          <ul className="mt-8 space-y-5">
            {[
              { icon: CalendarDays, title: 'On your schedule', body: 'Set the hours that suit you. Students book 45-minute video calls inside them.' },
              { icon: HeartHandshake, title: 'Matched to you', body: 'Students reach you after Pathy has pointed them at your field.' },
              { icon: ShieldCheck, title: 'Vetted', body: 'Every mentor is reviewed by the Pathora team before students can see them.' },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-ink">{title}</span>
                  <span className="text-[14px] leading-relaxed text-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-line p-6 md:p-8">
          {!user ? (
            <div className="py-6 text-center">
              <h2 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Apply in five minutes</h2>
              <p className="mx-auto mt-2 max-w-sm text-[15px] text-muted">
                Create a free account first, then fill in your application.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href={`/signup?next=${RETURN}`}
                  className="rounded bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
                >
                  Create an account
                </Link>
                <Link
                  href={`/signin?callbackUrl=${RETURN}`}
                  className="rounded border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface"
                >
                  I already have one
                </Link>
              </div>
            </div>
          ) : user.role === 'admin' ? (
            <p className="py-6 text-center text-[15px] text-muted">
              Admin accounts cannot apply as mentors. Sign in with a separate account to apply.
            </p>
          ) : (
            <>
              <h2 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Your application</h2>
              <p className="mt-1.5 text-[14px] text-muted">
                Signed in as {user.email}. Submitting turns this into a mentor account.
              </p>
              <div className="mt-7">
                <MentorApplicationForm />
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
