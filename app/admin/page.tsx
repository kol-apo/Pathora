import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import ConsoleFrame from '@/components/console/ConsoleFrame';
import { platformCounts } from '@/lib/db/queries/admin';
import { sessionHeadline } from '@/lib/db/queries/adminInsights';
import { bridgeFunnel, schemaValidation, sessionCompletion } from '@/lib/db/queries/research';

export const metadata = { title: 'Admin · Pathora' };
export const dynamic = 'force-dynamic';

function Stat({ value, label, href }: { value: React.ReactNode; label: string; href?: string }) {
  const body = (
    <>
      <p className="text-[28px] font-bold tracking-[-0.02em] text-navy">{value}</p>
      <p className="mt-1 text-[13px] text-muted">{label}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-line p-5 transition hover:border-navy hover:shadow-card">
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-line p-5">{body}</div>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {note && <p className="mt-0.5 text-[12.5px] text-muted">{note}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-muted">{children}</p>
);

/** Admin overview: who is on the platform, what needs attention, and the study's measures. */
export default async function AdminOverviewPage() {
  const [counts, funnel, validity, sessions, headline] = await Promise.all([
    platformCounts(),
    bridgeFunnel(),
    schemaValidation(),
    sessionCompletion(),
    sessionHeadline(),
  ]);
  const pending = counts.mentors.pending_review;

  return (
    <ConsoleFrame variant="admin" title="Overview" subtitle="The platform at a glance, and the study’s measures.">
      {pending > 0 && (
        <Link
          href="/admin/mentors"
          className="flex items-center justify-between gap-4 rounded-xl bg-navy px-6 py-5 text-white transition hover:bg-navy-deep"
        >
          <span>
            <span className="text-[17px] font-semibold">
              {pending} mentor application{pending === 1 ? '' : 's'} waiting for review
            </span>
            <span className="mt-0.5 block text-[13.5px] text-white/70">
              Approved mentors appear to students straight away.
            </span>
          </span>
          <ArrowRight size={20} />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat value={counts.students} label="Students" href="/admin/students" />
        <Stat value={counts.mentors.approved} label="Approved mentors" href="/admin/mentors?status=approved" />
        <Stat value={pending} label="Applications" href="/admin/mentors" />
        <Stat value={counts.discoveryResults} label="Discovery results" />
        <Stat value={counts.upcomingBookings} label="Upcoming sessions" href="/admin/sessions?view=upcoming" />
        <Stat value={headline.held} label="Sessions held" href="/admin/sessions?view=held" />
        <Stat
          value={headline.awaitingOutcome}
          label="Waiting for the mentor's outcome"
          href="/admin/sessions?view=awaiting"
        />
        <Stat
          value={headline.averageRating !== null ? `${headline.averageRating.toFixed(1)} / 5` : '–'}
          label={headline.ratings ? `Average of ${headline.ratings} student rating${headline.ratings === 1 ? '' : 's'}` : 'No student ratings yet'}
          href="/admin/feedback"
        />
      </div>

      <Panel
        title="Bridge funnel"
        note="The study’s primary measure: of the discovery results in each sector, how many led to a session with a surfaced mentor."
      >
        {funnel.length === 0 ? (
          <Empty>No discovery results have been saved yet.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[12px] uppercase tracking-[0.06em] text-faint">
              <tr>
                <th className="pb-2 font-semibold">Sector</th>
                <th className="pb-2 text-right font-semibold">Results</th>
                <th className="pb-2 text-right font-semibold">Viewed</th>
                <th className="pb-2 text-right font-semibold">Booked</th>
                <th className="pb-2 text-right font-semibold">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {funnel.map((r) => (
                <tr key={r.sector}>
                  <td className="py-2.5 text-ink">{r.sector}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.resultsGenerated}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.resultsViewed}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.resultsBooked}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums text-navy">{r.bridgeConversionPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="AI output validity" note="How often each prompt version met its output contract.">
          {validity.length === 0 ? (
            <Empty>No discovery results yet.</Empty>
          ) : (
            <ul className="space-y-3">
              {validity.map((v) => (
                <li key={v.promptVersion} className="text-sm">
                  <p className="font-medium text-ink">{v.promptVersion}</p>
                  <p className="text-muted">
                    {v.results} result{v.results === 1 ? '' : 's'} · {v.validityPct}% valid · {v.firstAttemptPct}% first time
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Session completion" note="Whether booked sessions take place, as mentors report them.">
          {sessions.reported.held + sessions.reported.missed + sessions.reported.awaiting === 0 ? (
            <Empty>No sessions have reached their time yet.</Empty>
          ) : (
            <div className="flex flex-col gap-1.5 text-sm text-ink">
              <p>
                {sessions.reported.held} held · {sessions.reported.missed} did not take place
                {sessions.reported.heldPct !== null ? ` (${sessions.reported.heldPct}% held)` : ''}
              </p>
              <p className="text-muted">
                {sessions.reported.heldViaBridge} of the held sessions came through the bridge.{' '}
                {sessions.reported.awaiting > 0 && `${sessions.reported.awaiting} still waiting for the mentor to say.`}
              </p>
              {sessions.sessions > 0 && (
                <p className="text-muted">
                  Video: {sessions.sessionsEnded} of {sessions.sessions} ended, median{' '}
                  {Math.round((sessions.medianDurationSeconds ?? 0) / 60)} minutes.
                </p>
              )}
            </div>
          )}
        </Panel>
      </div>
    </ConsoleFrame>
  );
}
