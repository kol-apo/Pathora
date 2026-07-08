import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import StatCard from '@/components/dashboard/StatCard';
import UpcomingSession from '@/components/dashboard/UpcomingSession';
import ConsultantCardCompact from '@/components/consultant/ConsultantCardCompact';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import { consultants, currentStudent, opportunities } from '@/lib/data';

export default function DashboardPage() {
  const student = currentStudent;
  const recommended = consultants
    .filter((c) => c.sector === student.matchedSector)
    .slice(0, 3);
  const latestOpportunities = opportunities.slice(0, 3);

  return (
    <div className="min-h-screen bg-cream">
      <Sidebar />
      <main className="px-5 pb-24 pt-8 md:px-10 lg:ml-60 lg:pb-12">
        <div className="mx-auto max-w-5xl">
          <header className="animate-fade-up">
            <h1 className="font-fraunces text-[26px] font-bold text-navy md:text-[28px]">
              Good morning, {student.name.split(' ')[0]} 👋
            </h1>
            <p className="mt-1 text-[15px] text-text-muted">
              Here&apos;s what&apos;s happening in your career journey.
            </p>
          </header>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard value={student.sessionsBooked} label="Sessions Booked" />
            <StatCard value={student.consultantsExplored} label="Consultants Explored" />
            <StatCard value={student.opportunitiesSaved} label="Opportunities Saved" />
            <StatCard value={student.careerMatch} label="Career Match" />
          </div>

          {/* Upcoming session */}
          <div className="mt-8">
            <UpcomingSession session={student.upcomingSession} />
          </div>

          {/* Recommended + opportunities */}
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <section>
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="font-fraunces text-xl font-bold text-navy">
                    Recommended for You
                  </h2>
                  <p className="mt-1 text-[13px] text-text-muted">
                    Based on your {student.careerMatch} match
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {recommended.map((c) => (
                  <ConsultantCardCompact key={c.id} consultant={c} />
                ))}
              </div>
              <Link
                href="/explore"
                className="mt-4 inline-block text-sm font-semibold text-amber-dark transition-colors hover:text-amber"
              >
                View all consultants →
              </Link>
            </section>

            <section id="opportunities">
              <h2 className="font-fraunces text-xl font-bold text-navy">Latest Opportunities</h2>
              <p className="mt-1 text-[13px] text-text-muted">
                Curated for {student.matchedSector} and beyond
              </p>
              <div className="mt-4 space-y-3">
                {latestOpportunities.map((o) => (
                  <OpportunityCard key={o.id} opportunity={o} />
                ))}
              </div>
              <Link
                href="#opportunities"
                className="mt-4 inline-block text-sm font-semibold text-amber-dark transition-colors hover:text-amber"
              >
                View all opportunities →
              </Link>
            </section>
          </div>

          {/* Career path banner */}
          <section className="mt-8 rounded-xl border-l-[6px] border-amber bg-amber-light p-6 md:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-fraunces text-xl font-bold text-navy">
                  Your career match: {student.careerMatch}
                </h2>
                <p className="mt-1.5 text-sm font-medium text-amber-dark">
                  Roadmap: Step 1 of 3 — building your foundations
                </p>
              </div>
              <div className="flex items-center gap-5">
                <Link
                  href="/explore"
                  className="inline-flex h-11 items-center rounded-[10px] bg-amber px-6 text-sm font-semibold text-white transition-all duration-[180ms] hover:scale-[1.02] hover:bg-amber-dark active:scale-[0.98]"
                >
                  Continue exploring
                </Link>
                <Link
                  href="/discover"
                  className="text-sm font-medium text-text-muted transition-colors hover:text-text-main"
                >
                  Retake assessment →
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
