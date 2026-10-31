import Link from 'next/link';
import { X } from 'lucide-react';
import ConsoleFrame from '@/components/console/ConsoleFrame';
import LocalTime from '@/components/console/LocalTime';
import { EmptyState, Participant, Stars, td, th } from '@/components/console/AdminBits';
import {
  listSessionsForAdmin,
  SESSION_VIEW_LABELS,
  SESSION_VIEWS,
  type AdminSessionRow,
  type SessionView,
} from '@/lib/db/queries/adminInsights';

export const metadata = { title: 'Sessions · Admin · Pathora' };
export const dynamic = 'force-dynamic';

const EMPTY: Record<SessionView, string> = {
  upcoming: 'No sessions coming up.',
  awaiting: 'Every past session has an outcome.',
  held: 'No sessions have been marked as held yet.',
  missed: 'No sessions have been marked as not taking place.',
  unconfirmed: 'Every request was answered before its time.',
  cancelled: 'No cancelled sessions.',
  all: 'No sessions have been booked yet.',
};

function statusOf(r: AdminSessionRow, now: number): { label: string; tone: string } {
  const past = Date.parse(r.startsAt) < now;
  switch (r.status) {
    case 'pending':
      return past ? { label: 'Never confirmed', tone: 'bg-fill text-muted' } : { label: 'Awaiting mentor', tone: 'bg-sky-soft text-navy' };
    case 'confirmed':
      return past ? { label: 'Needs outcome', tone: 'bg-sky-soft text-navy' } : { label: 'Confirmed', tone: 'bg-available/10 text-available' };
    case 'completed':
      return { label: 'Held', tone: 'bg-available/10 text-available' };
    case 'no_show':
      return { label: 'Did not happen', tone: 'bg-fill text-muted' };
    case 'cancelled':
      return { label: r.cancelledBy ? `Cancelled by ${r.cancelledBy}` : 'Cancelled', tone: 'bg-fill text-muted' };
  }
}

function Video({ v }: { v: AdminSessionRow['video'] }) {
  if (!v) return <span className="text-faint">Not opened</span>;
  const who = v.studentJoined && v.mentorJoined ? 'Both joined' : v.studentJoined ? 'Student only' : v.mentorJoined ? 'Mentor only' : 'Nobody joined';
  return (
    <span>
      {who}
      {v.minutes !== null && <span className="text-muted"> · {v.minutes} min</span>}
    </span>
  );
}

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: { view?: string; mentor?: string };
}) {
  const view: SessionView = SESSION_VIEWS.includes(searchParams.view as SessionView)
    ? (searchParams.view as SessionView)
    : 'upcoming';
  const { rows, counts, mentorName } = await listSessionsForAdmin({ view, mentorId: searchParams.mentor });
  const now = Date.now();
  const scope = mentorName && searchParams.mentor ? `&mentor=${searchParams.mentor}` : '';

  return (
    <ConsoleFrame
      variant="admin"
      title="Sessions"
      subtitle="Every booking: whether it happened, whether both people joined the call, and how the student rated it. Students appear by participant code."
    >
      {mentorName && (
        <div className="flex items-center gap-2 self-start rounded-full bg-sky-soft py-1.5 pl-4 pr-2 text-[13.5px] text-navy">
          Showing sessions with <span className="font-semibold">{mentorName}</span>
          <Link href={`/admin/sessions?view=${view}`} aria-label="Show every mentor" className="rounded-full p-1 hover:bg-sky-muted">
            <X size={14} />
          </Link>
        </div>
      )}

      <nav className="flex flex-wrap gap-2" aria-label="Session filter">
        {SESSION_VIEWS.map((v) => (
          <Link
            key={v}
            href={`/admin/sessions?view=${v}${scope}`}
            aria-current={v === view ? 'page' : undefined}
            className={`rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors ${
              v === view ? 'bg-navy text-white' : 'border border-line text-ink hover:bg-sky-soft'
            }`}
          >
            {SESSION_VIEW_LABELS[v]} <span className={v === view ? 'text-white/70' : 'text-faint'}>{counts[v]}</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState>{EMPTY[view]}</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[960px]">
            <thead className="border-b border-line bg-surface">
              <tr>
                <th className={th}>When (your time)</th>
                <th className={th}>Mentor</th>
                <th className={th}>Student</th>
                <th className={th}>Topic</th>
                <th className={th}>Status</th>
                <th className={th}>Video call</th>
                <th className={th}>Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const s = statusOf(r, now);
                return (
                  <tr key={r.id}>
                    <td className={`${td} whitespace-nowrap tabular-nums`}>
                      <LocalTime iso={r.startsAt} />
                    </td>
                    <td className={td}>
                      {r.mentor ? (
                        <Link href={`/admin/sessions?view=all&mentor=${r.mentor.id}`} className="hover:underline underline-offset-2">
                          {r.mentor.name}
                        </Link>
                      ) : (
                        <span className="text-faint">Deleted</span>
                      )}
                      {r.mentor && <span className="block text-[12px] text-muted">{r.mentor.sector}</span>}
                    </td>
                    <td className={td}>
                      <Participant code={r.participantCode} />
                    </td>
                    <td className={`${td} max-w-[220px]`}>
                      <span className="line-clamp-2">{r.topic}</span>
                    </td>
                    <td className={td}>
                      <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium ${s.tone}`}>
                        {s.label}
                      </span>
                      {r.viaBridge && <span className="mt-1 block text-[12px] text-muted">Via the bridge</span>}
                    </td>
                    <td className={td}>
                      <Video v={r.video} />
                    </td>
                    <td className={`${td} max-w-[240px]`}>
                      {r.rating ? (
                        <>
                          <Stars score={r.rating.score} />
                          {r.rating.comment && <span className="mt-1 block line-clamp-3 text-[12.5px] text-muted">“{r.rating.comment}”</span>}
                        </>
                      ) : (
                        <span className="text-faint">None</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length >= 200 && <p className="text-[13px] text-muted">Showing the 200 most relevant. Narrow the list with the filters above.</p>}
    </ConsoleFrame>
  );
}
