import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';
import { auth } from '@/auth';
import { listBookingsForStudent } from '@/lib/db/queries/bookings';
import { bridgeForResult, getLatestResult, listOpenOpportunities } from '@/lib/db/queries/discovery';
import type { BookingDTO, MentorDTO } from '@/lib/db/queries/dto';
import { roleLine } from '@/lib/mentors';
import LocalTime from '@/components/dashboard/LocalTime';
import OpportunityRow from '@/components/opportunities/OpportunityRow';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';

export const metadata = { title: 'Overview · Pathora' };
export const dynamic = 'force-dynamic';

type Session = BookingDTO & { mentor: MentorDTO };
const hasMentor = (b: BookingDTO): b is Session => typeof b.mentor !== 'string';

/** A titled card with an optional link in its header. */
function Card({
  title,
  href,
  linkLabel,
  id,
  children,
  className = '',
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`flex scroll-mt-6 flex-col overflow-hidden rounded-lg border border-line ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {href && linkLabel && (
          <Link href={href} className="text-[13px] text-muted transition-colors hover:text-ink">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * The student's home. Read top to bottom: the one thing to do next, where
 * they are (direction and sessions), the three people matched to them, and
 * opportunities in their field.
 */
export default async function OverviewPage() {
  const session = await auth();
  const studentId = session!.user!.id!;
  const firstName = (session?.user?.name ?? '').split(' ')[0];
  const now = new Date();

  const [bookings, latest] = await Promise.all([
    listBookingsForStudent(studentId, { limit: 100 }),
    getLatestResult(studentId),
  ]);
  const career = latest?.match.primary ?? null;
  const [bridge, opportunities] = await Promise.all([
    latest ? bridgeForResult(latest.id, studentId).catch(() => null) : null,
    listOpenOpportunities(career?.sector ?? null, 3, now),
  ]);

  const upcoming = bookings
    .filter(hasMentor)
    .filter((b) => (b.status === 'pending' || b.status === 'confirmed') && new Date(b.endsAt) >= now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const pastCount = bookings.filter((b) => b.status === 'completed' || new Date(b.endsAt) < now).length;
  const matches = bridge?.status === 'ready' ? bridge.mentors : [];
  const next = upcoming[0];

  // The single most useful thing to do now.
  const step = !career
    ? {
        eyebrow: 'Start here',
        title: 'Speak with Pathy to find your direction',
        body: 'Six quick questions, about two minutes. You get a career direction, a roadmap, and three mentors working in that field.',
        href: '/discover',
        cta: 'Speak with Pathy',
      }
    : next
      ? {
          eyebrow: next.status === 'confirmed' ? 'Your next session is confirmed' : 'Your next session',
          title: `${next.mentor.displayName} · ${next.topic}`,
          body: null,
          time: next.startsAt,
          waiting: next.status === 'pending' ? `Waiting for ${next.mentor.displayName.split(' ')[0]} to confirm` : null,
          href: '/sessions',
          cta: 'View sessions',
        }
      : {
          eyebrow: 'Next step',
          title:
            matches.length > 0
              ? `Book a free session with one of your ${matches.length} matches`
              : 'Book a free session with a mentor',
          body: 'Ask them what the work is really like, and how they got in.',
          href: matches.length > 0 ? '#matches' : '/explore',
          cta: matches.length > 0 ? 'See your matches' : 'Find a mentor',
        };

  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-6 px-5 pb-16 pt-10 md:px-10">
      <header>
        <h1 className="text-[26px] font-bold tracking-[-0.03em] text-ink md:text-[30px]">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1.5 text-[15px] text-muted">
          {career ? `Your direction: ${career.title}.` : 'Let’s find your direction first.'}
        </p>
      </header>

      {/* 1. The next step */}
      <section className="on-dark flex flex-col gap-5 rounded-lg bg-navy p-6 md:flex-row md:items-center md:justify-between md:p-7">
        <div className="flex min-w-0 items-center gap-4">
          {next && career ? (
            <Avatar initials={next.mentor.initials} photo={next.mentor.photo} size="lg" tone="dark" className="hidden sm:inline-flex" />
          ) : null}
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-micro font-semibold uppercase tracking-[0.08em] text-white/55">{step.eyebrow}</span>
            <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-white">{step.title}</h2>
            {'time' in step && step.time ? (
              <p className="text-[13.5px] text-white/70">
                <LocalTime iso={step.time} /> · 45 minutes{step.waiting ? ` · ${step.waiting}` : ''}
              </p>
            ) : (
              step.body && <p className="max-w-xl text-[13.5px] leading-relaxed text-white/70">{step.body}</p>
            )}
          </div>
        </div>
        <Link
          href={step.href}
          className="group flex shrink-0 items-center gap-2 self-start rounded bg-white px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-white/90 md:self-auto"
        >
          {step.cta}
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>

      {/* 2. Where you are */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your direction" href={latest ? `/discover/results/${latest.id}` : undefined} linkLabel="Full roadmap">
          {career ? (
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-[18px] font-semibold tracking-[-0.01em] text-ink">{career.title}</p>
                <Badge variant="sector">{career.sector}</Badge>
              </div>
              <ol className="flex flex-col gap-2.5">
                {career.roadmap.map((phase, i) => (
                  <li key={phase.period} className="flex items-start gap-3">
                    <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-soft text-[12px] font-semibold text-navy">
                      {i + 1}
                    </span>
                    <span className="text-[13.5px] leading-relaxed text-ink">
                      <span className="text-muted">{phase.period}:</span> {phase.focus}
                    </span>
                  </li>
                ))}
              </ol>
              <Link
                href="/discover"
                className="mt-auto inline-flex items-center gap-2 self-start rounded border border-line px-4 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface"
              >
                <Compass size={15} strokeWidth={1.75} />
                Ask Pathy about it
              </Link>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-start gap-3 p-5">
              <p className="text-[13.5px] leading-relaxed text-muted">
                No direction yet. Pathy asks six questions, then gives you a three-stage roadmap built for the
                African job market.
              </p>
              <Link href="/discover" className="text-[13.5px] font-medium text-ink underline underline-offset-2">
                Speak with Pathy
              </Link>
            </div>
          )}
        </Card>

        <Card title="Your sessions" href="/sessions" linkLabel="All sessions">
          <div className="grid grid-cols-2 border-b border-line">
            <div className="flex flex-col gap-0.5 border-r border-line px-5 py-4">
              <span className="text-[24px] font-semibold tracking-[-0.02em] text-ink">{upcoming.length}</span>
              <span className="text-[12.5px] text-muted">Coming up</span>
            </div>
            <div className="flex flex-col gap-0.5 px-5 py-4">
              <span className="text-[24px] font-semibold tracking-[-0.02em] text-ink">{pastCount}</span>
              <span className="text-[12.5px] text-muted">Past</span>
            </div>
          </div>
          {upcoming.length > 0 ? (
            <ul className="flex flex-col divide-y divide-line">
              {upcoming.slice(0, 3).map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3.5">
                  <Avatar initials={b.mentor.initials} photo={b.mentor.photo} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{b.mentor.displayName}</p>
                    <p className="truncate text-[12.5px] text-muted">
                      <LocalTime iso={b.startsAt} /> · {b.status === 'confirmed' ? 'Confirmed' : 'Waiting to confirm'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-1 flex-col items-start gap-3 p-5">
              <p className="text-[13.5px] leading-relaxed text-muted">Nothing booked. Sessions are free and 45 minutes long.</p>
              <Link href="/explore" className="text-[13.5px] font-medium text-ink underline underline-offset-2">
                Book a session
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* 3. The three people matched to them */}
      {career && (
        <Card id="matches" title="Matched to your path" href="/explore" linkLabel="All mentors">
          {matches.length > 0 ? (
            <ul className="grid gap-px bg-line sm:grid-cols-3">
              {matches.map((m, i) => (
                <li key={m.id} className="flex flex-col gap-3 bg-white p-5">
                  <span className="text-micro font-semibold uppercase text-faint">
                    {i === 0 ? 'Closest match' : `Match ${i + 1}`}
                  </span>
                  <div className="flex items-center gap-3">
                    <Avatar initials={m.initials} photo={m.photo} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-semibold text-ink">{m.displayName}</p>
                      <p className="truncate text-[12.5px] text-muted">{roleLine(m)}</p>
                    </div>
                  </div>
                  <Link
                    href={`/consultants/${m.id}?bridge=${latest!.id}`}
                    className="mt-auto rounded bg-navy py-2.5 text-center text-[13.5px] font-medium text-white transition-colors hover:bg-navy-deep"
                  >
                    Book a session
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-5 text-[13.5px] text-muted">
              We are still vetting enough {career.sector} mentors to match you with three.{' '}
              <Link href={`/explore?sector=${encodeURIComponent(career.sector)}`} className="font-medium text-ink underline underline-offset-2">
                Browse {career.sector} mentors
              </Link>
            </p>
          )}
        </Card>
      )}

      {/* 4. Opportunities */}
      <Card
        title={career ? `Opportunities for you` : 'Open opportunities'}
        href="/opportunities"
        linkLabel="All opportunities"
      >
        {opportunities.length > 0 ? (
          <div className="flex flex-col divide-y divide-line">
            {opportunities.map((o) => (
              <OpportunityRow key={o.id} opportunity={o} now={now} />
            ))}
          </div>
        ) : (
          <p className="px-5 py-5 text-[13.5px] text-muted">No open opportunities right now. New ones arrive every day.</p>
        )}
      </Card>
    </main>
  );
}
