import ConsoleFrame from '@/components/console/ConsoleFrame';
import LocalTime from '@/components/console/LocalTime';
import { EmptyState, Stat, td, th } from '@/components/console/AdminBits';
import { listParticipants } from '@/lib/db/queries/adminInsights';

export const metadata = { title: 'Students · Admin · Pathora' };
export const dynamic = 'force-dynamic';

export default async function AdminStudentsPage() {
  const { rows, notConsented } = await listParticipants();
  const sum = (k: 'discoveries' | 'booked' | 'held' | 'rated') => rows.reduce((n, r) => n + r[k], 0);
  const discovered = rows.filter((r) => r.discoveries > 0).length;
  const booked = rows.filter((r) => r.booked > 0).length;

  return (
    <ConsoleFrame
      variant="admin"
      title="Students"
      subtitle="Each study participant's activity, by participant code. Names and emails are not shown here."
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat value={rows.length} label="Participants (consented)" />
        <Stat value={`${discovered}`} label="Finished career discovery" />
        <Stat value={`${booked}`} label="Booked at least one session" />
        <Stat value={sum('rated')} label="Sessions rated" href="/admin/feedback" />
      </div>
      {notConsented > 0 && (
        <p className="text-[13.5px] text-muted">
          {notConsented} more {notConsented === 1 ? 'student has' : 'students have'} signed up but not consented, so{' '}
          {notConsented === 1 ? 'is' : 'are'} not part of the study and not listed.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState>No participants yet. Students appear here once they consent.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-line bg-surface">
              <tr>
                <th className={th}>Participant</th>
                <th className={th}>Joined the study</th>
                <th className={th}>Career match</th>
                <th className={`${th} text-right`}>Discoveries</th>
                <th className={`${th} text-right`}>Sessions booked</th>
                <th className={`${th} text-right`}>Via the bridge</th>
                <th className={`${th} text-right`}>Held</th>
                <th className={`${th} text-right`}>Rated</th>
                <th className={th}>Latest session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.participantCode}>
                  <td className={`${td} font-mono text-[12.5px]`}>{r.participantCode}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    <LocalTime iso={r.consentedAt} time={false} />
                  </td>
                  <td className={td}>{r.latestSector ?? <span className="text-faint">Not yet</span>}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.discoveries}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.booked}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.viaBridge}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.held}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.rated}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {r.lastSessionAt ? <LocalTime iso={r.lastSessionAt} time={false} /> : <span className="text-faint">None</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ConsoleFrame>
  );
}
