import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { auth } from '@/auth';
import { homeFor } from '@/lib/auth/guard';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroJourney from '@/components/landing/HeroJourney';
import { About, ClosingCta, ForMentors, HowItWorks, Sectors } from '@/components/landing/LandingSections';
import { listMentors } from '@/lib/db/queries/mentors';
import { partnersFirst, toConsultant } from '@/lib/mentors';
import { consultants as sampleConsultants } from '@/lib/data';
import type { Consultant } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Approved mentors for the sector cards and the hero count. Empty if the database is unreachable. */
async function approvedMentors(): Promise<Consultant[]> {
  try {
    const { mentors } = await listMentors({ limit: 100 });
    return partnersFirst(mentors.map(toConsultant));
  } catch (err) {
    console.error('[landing] could not load mentors:', err);
    return [];
  }
}

/**
 * The public front door: what Pathora is, how it works, and the way in for
 * students and for mentors. Signed-in users never see it; they go straight
 * to their own home.
 */
export default async function LandingPage({ searchParams }: { searchParams: { deleted?: string } }) {
  const session = await auth();
  if (session?.user) redirect(homeFor(session.user.role));

  const mentors = await approvedMentors();

  return (
    <>
      <Navbar />
      {searchParams.deleted === '1' && (
        <p role="status" className="border-b border-sky-muted bg-sky-soft px-5 py-3 text-center text-[14px] text-navy">
          Your account and all your data have been deleted. Thank you for taking part.
        </p>
      )}
      <main className="mx-auto max-w-[1440px]">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="grid items-center gap-12 px-5 py-16 md:px-10 lg:grid-cols-2 lg:py-24">
          <div className="max-w-xl">
            <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.03em] text-ink md:text-[56px]">
              Your career{' '}
              <span className="relative inline-block">
                path
                <svg
                  viewBox="0 0 120 14"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1.5 left-0 h-3 w-full md:-bottom-2"
                  aria-hidden="true"
                >
                  <path
                    d="M3 10 C 30 3, 70 2, 117 6"
                    pathLength={1}
                    fill="none"
                    stroke="#96CAD3"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeDasharray="1"
                    className="animate-draw motion-reduce:animate-none"
                    style={{ animationDelay: '0.3s' }}
                  />
                </svg>
              </span>{' '}
              starts here, not after.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
              Speak with Pathy to find your direction, then book a free session with a vetted professional
              already working in it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="group flex items-center gap-2 rounded bg-navy px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
              >
                Get started, it&apos;s free
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/become-a-mentor"
                className="rounded border border-line px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-surface"
              >
                Become a mentor
              </Link>
            </div>
            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-6">
              {[
                ...(mentors.length > 0 ? [[String(mentors.length), 'Vetted mentors']] : []),
                ['4', 'Sectors'],
                ['Free', 'Always, for students'],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="mt-0.5 text-[12.5px] text-muted">{label}</dt>
                  <dd className="text-xl font-bold tracking-[-0.02em] text-navy">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* An illustration of the journey, drawn with sample people. */}
          <HeroJourney consultant={sampleConsultants[0]} />
        </section>

        <HowItWorks consultant={sampleConsultants[1]} />
        <Sectors consultants={mentors} />
        <ForMentors />
        <About />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
