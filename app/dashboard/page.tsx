import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import StatCard from '@/components/dashboard/StatCard';
import UpcomingSession from '@/components/dashboard/UpcomingSession';
import ConsultantCardCompact from '@/components/consultant/ConsultantCardCompact';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import { currentStudent, featuredForSector, opportunities } from '@/lib/data';

/** Bordered panel with a header row and a divided list of rows. */
function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line">
      <div className="flex items-center justify-between border-b border-line px-5 py-[18px]">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <Link href={href} className="text-[13px] text-muted transition-colors hover:text-ink">
          View all
        </Link>
      </div>
      <div className="flex flex-col divide-y divide-line">{children}</div>
    </section>
  );
}

export default function DashboardPage() {
  const student = currentStudent;
  const recommended = featuredForSector(student.matchedSector, 3);
  const latestOpportunities = opportunities.slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      <main className="px-5 pb-24 pt-8 md:px-10 lg:ml-[248px] lg:pb-10">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-7">
          <header>
            <h1 className="text-[26px] font-bold tracking-[-0.03em] text-ink md:text-[28px]">
              Welcome back, {student.name.split(' ')[0]}
            </h1>
            <p className="mt-1.5 text-[15px] text-muted">
              {student.field}, Year {student.year} · Career match: {student.careerMatch}
            </p>
          </header>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard value={student.sessionsBooked} label="Sessions booked" />
            <StatCard value={student.consultantsExplored} label="Consultants explored" />
            <StatCard value={student.opportunitiesSaved} label="Opportunities saved" />
            <StatCard value={student.careerMatch} label="Career match" />
          </div>

          <UpcomingSession session={student.upcomingSession} />

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Recommended for your path" href="/explore">
              {recommended.map((c) => (
                <ConsultantCardCompact key={c.id} consultant={c} />
              ))}
            </Panel>

            <div id="opportunities">
              <Panel title="Latest opportunities" href="#opportunities">
                {latestOpportunities.map((o) => (
                  <OpportunityCard key={o.id} opportunity={o} />
                ))}
              </Panel>
            </div>
          </div>

          {/* Career path progress */}
          <section className="flex flex-col gap-6 rounded-lg border border-line bg-surface p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-col gap-3.5 md:pr-8">
              <div className="flex flex-col gap-1">
                <h2 className="text-[15px] font-semibold text-ink">
                  {student.careerMatch} path · Year {student.pathYear} of {student.pathYears}
                </h2>
                <p className="text-[13.5px] text-muted">
                  Foundations in progress — {student.milestonesDone} of {student.milestonesTotal}{' '}
                  milestones done.
                </p>
              </div>
              <div
                className="flex max-w-[420px] gap-1.5"
                role="progressbar"
                aria-valuenow={student.milestonesDone}
                aria-valuemin={0}
                aria-valuemax={student.milestonesTotal}
                aria-label="Milestones completed"
              >
                {Array.from({ length: student.milestonesTotal }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      i < student.milestonesDone ? 'bg-ink' : 'bg-line'
                    }`}
                  />
                ))}
              </div>
            </div>
            <Link
              href="/discover"
              className="shrink-0 self-start rounded border border-line bg-white px-[18px] py-[11px] text-sm font-medium text-ink transition-colors hover:bg-surface md:self-auto"
            >
              View roadmap
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
