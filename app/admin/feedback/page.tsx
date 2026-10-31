import Link from 'next/link';
import ConsoleFrame from '@/components/console/ConsoleFrame';
import LocalTime from '@/components/console/LocalTime';
import { EmptyState, Panel, Participant, Stars, Stat, td, th } from '@/components/console/AdminBits';
import { feedbackSummary } from '@/lib/db/queries/adminInsights';

export const metadata = { title: 'Feedback · Admin · Pathora' };
export const dynamic = 'force-dynamic';

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

export default async function AdminFeedbackPage() {
  const f = await feedbackSummary();
  const maxBar = Math.max(1, ...f.distribution);

  return (
    <ConsoleFrame
      variant="admin"
      title="Feedback"
      subtitle="How students rate their sessions, and how each mentor's sessions are going. Comments are seen only by the Pathora team."
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat value={f.averageRating !== null ? `${f.averageRating.toFixed(1)} / 5` : '–'} label="Average rating" />
        <Stat value={f.ratings} label={`Rating${f.ratings === 1 ? '' : 's'} from students`} />
        <Stat value={f.withComment} label="With a written comment" />
        <Stat
          value={f.byMentor.reduce((n, m) => n + m.held, 0)}
          label="Sessions held"
          href="/admin/sessions?view=held"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Panel title="Ratings" note="Stars given after a session.">
          {f.ratings === 0 ? (
            <p className="text-sm text-muted">No ratings yet. Students can rate a session once it has ended.</p>
          ) : (
            <ul className="space-y-2">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = f.distribution[n - 1];
                return (
                  <li key={n} className="flex items-center gap-3 text-[13px]">
                    <span className="w-14 shrink-0 tabular-nums text-ink">{n} star{n === 1 ? '' : 's'}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-fill">
                      <span className="block h-full rounded-full bg-navy" style={{ width: `${(count / maxBar) * 100}%` }} />
                    </span>
                    <span className="w-16 shrink-0 text-right tabular-nums text-muted">
                      {count} · {pct(count, f.ratings)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="What students said" note="Newest first." flush>
          {f.comments.length === 0 ? (
            <p className="p-5 text-sm text-muted">Nothing yet.</p>
          ) : (
            <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
              {f.comments.map((c) => (
                <li key={c.bookingId} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                    <Stars score={c.score} />
                    <span>
                      for{' '}
                      {c.mentor ? (
                        <Link href={`/admin/sessions?view=all&mentor=${c.mentor.id}`} className="font-medium text-ink hover:underline underline-offset-2">
                          {c.mentor.name}
                        </Link>
                      ) : (
                        'a deleted mentor'
                      )}
                    </span>
                    <span>
                      by <Participant code={c.participantCode} />
                    </span>
                    {c.viaBridge && <span>via the bridge</span>}
                    <span className="ml-auto">
                      <LocalTime iso={c.ratedAt} time={false} />
                    </span>
                  </div>
                  {c.comment ? (
                    <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink">{c.comment}</p>
                  ) : (
                    <p className="mt-1.5 text-[13px] text-faint">No comment.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="By mentor"
        note="Every mentor with at least one booking. Held and missed come from what the mentor records after each session."
        flush
      >
        {f.byMentor.length === 0 ? (
          <div className="p-5">
            <EmptyState>No sessions have been booked yet.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-line bg-surface">
                <tr>
                  <th className={th}>Mentor</th>
                  <th className={`${th} text-right`}>Booked</th>
                  <th className={`${th} text-right`}>Upcoming</th>
                  <th className={`${th} text-right`}>Held</th>
                  <th className={`${th} text-right`}>Did not happen</th>
                  <th className={`${th} text-right`}>Cancelled</th>
                  <th className={th}>Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {f.byMentor.map((m) => (
                  <tr key={m.mentorId}>
                    <td className={td}>
                      <Link href={`/admin/sessions?view=all&mentor=${m.mentorId}`} className="font-medium hover:underline underline-offset-2">
                        {m.name}
                      </Link>
                      <span className="block text-[12px] text-muted">
                        {m.sector}
                        {m.status !== 'approved' && ` · ${m.status.replace('_', ' ')}`}
                      </span>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{m.booked}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.upcoming}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.held}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.missed}</td>
                    <td className={`${td} text-right tabular-nums`}>{m.cancelled}</td>
                    <td className={td}>
                      {m.averageRating !== null ? (
                        <span className="flex items-center gap-2 whitespace-nowrap">
                          <Stars score={Math.round(m.averageRating)} />
                          <span className="tabular-nums">{m.averageRating.toFixed(1)}</span>
                          <span className="text-[12px] text-muted">({m.ratings})</span>
                        </span>
                      ) : (
                        <span className="text-faint">No ratings</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </ConsoleFrame>
  );
}
