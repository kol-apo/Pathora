import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarDays, Clock, ShieldCheck } from 'lucide-react';
import { auth } from '@/auth';
import ConsoleFrame from '@/components/console/ConsoleFrame';
import BookingResponse from '@/components/console/BookingResponse';
import Guide from '@/components/brand/Guide';
import SessionOutcome from '@/components/console/SessionOutcome';
import { getMentorSelf, getMyAvailability, listMyBookings, listMyPastSessions } from '@/lib/db/queries/mentorConsole';

export const metadata = { title: 'Mentor · Pathora' };
export const dynamic = 'force-dynamic';

const when = (iso: string, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(new Date(iso));

const STATUS_COPY = {
  pending_review: {
    title: 'Your application is being reviewed',
    body: 'The Pathora team checks every mentor before students can see them. You can set your weekly hours now, so you are ready the moment you are approved.',
  },
  rejected: {
    title: 'Your application was not approved',
    body: 'Thank you for applying. If you think this was a mistake, contact the Pathora team.',
  },
  suspended: {
    title: 'Your profile is paused',
    body: 'Students cannot see or book you while your profile is paused. Contact the Pathora team to reinstate it.',
  },
} as const;

/** Mentor home: application status, then booking requests and upcoming sessions. */
export default async function MentorHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/mentor');

  const me = await getMentorSelf(session.user.id);
  if (!me) redirect('/become-a-mentor');

  const [bookings, availability, past] = await Promise.all([
    listMyBookings(session.user.id),
    getMyAvailability(session.user.id),
    listMyPastSessions(session.user.id),
  ]);
  const requests = bookings.filter((b) => b.status === 'pending');
  const confirmed = bookings.filter((b) => b.status === 'confirmed' && !past.awaiting.some((a) => a.id === b.id));
  const hasHours = (availability?.weekly.length ?? 0) > 0;
  const firstName = me.displayName.split(' ')[0];

  return (
    <ConsoleFrame
      variant="mentor"
      title={`Welcome, ${firstName}`}
      subtitle={[me.role, me.company, me.sector].filter(Boolean).join(' · ')}
    >
      {me.status !== 'approved' ? (
        <section className="flex flex-col gap-5 rounded-xl border border-sky-muted bg-sky-soft p-6 sm:flex-row sm:items-center">
          <Guide size={72} mood={me.status === 'pending_review' ? 'thinking' : 'idle'} />
          <div>
            <h2 className="text-[18px] font-semibold text-ink">{STATUS_COPY[me.status].title}</h2>
            <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-muted">{STATUS_COPY[me.status].body}</p>
          </div>
        </section>
      ) : (
        <section className="flex items-center gap-3 rounded-xl border border-line px-5 py-4 text-[14px] text-ink">
          <ShieldCheck size={18} className="text-navy" />
          You are approved and visible to students.
          {!me.acceptingBookings && <span className="text-muted">You have paused new bookings.</span>}
        </section>
      )}

      {!hasHours && me.status !== 'rejected' && (
        <Link
          href="/mentor/availability"
          className="flex items-center justify-between gap-4 rounded-xl bg-navy px-6 py-5 text-white transition hover:bg-navy-deep"
        >
          <span className="flex items-center gap-3">
            <Clock size={20} />
            <span>
              <span className="block text-[16px] font-semibold">Set your weekly hours</span>
              <span className="text-[13.5px] text-white/70">Students can only book times you make available.</span>
            </span>
          </span>
        </Link>
      )}

      <section className="overflow-hidden rounded-xl border border-line">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">
            Requests waiting for you {requests.length > 0 && <span className="text-navy">· {requests.length}</span>}
          </h2>
        </div>
        {requests.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No requests right now.</p>
        ) : (
          <ul className="divide-y divide-line">
            {requests.map((b) => (
              <li key={b.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[15px] font-medium text-ink">
                    {b.studentName} · {when(b.startsAt, me.timezone)}
                  </p>
                  <p className="text-[13.5px] text-muted">
                    {b.topic}
                    {b.viaBridge && ' · matched to you by Pathy'}
                  </p>
                </div>
                <BookingResponse bookingId={b.id} studentName={b.studentName} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-line">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">Upcoming sessions</h2>
        </div>
        {confirmed.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">No confirmed sessions yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {confirmed.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-5 py-4">
                <CalendarDays size={18} className="shrink-0 text-navy" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-ink">
                    {b.studentName} · {when(b.startsAt, me.timezone)}
                  </p>
                  <p className="text-[13.5px] text-muted">{b.topic}</p>
                </div>
                <Link
                  href={`/session/${b.id}`}
                  className="shrink-0 rounded border border-line px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
                >
                  Session room
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {past.awaiting.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-sky-muted">
          <div className="border-b border-sky-muted bg-sky-soft px-5 py-4">
            <h2 className="text-[15px] font-semibold text-ink">Did these sessions happen? · {past.awaiting.length}</h2>
            <p className="mt-0.5 text-[13px] text-muted">It takes a second, and it is how Pathora knows students are being helped.</p>
          </div>
          <ul className="divide-y divide-line">
            {past.awaiting.map((b) => (
              <li key={b.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[15px] font-medium text-ink">
                    {b.studentName} · {when(b.startsAt, me.timezone)}
                  </p>
                  <p className="text-[13.5px] text-muted">{b.topic}</p>
                </div>
                <SessionOutcome bookingId={b.id} studentName={b.studentName} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.recent.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-line">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold text-ink">Past sessions</h2>
          </div>
          <ul className="divide-y divide-line">
            {past.recent.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] text-ink">
                    {b.studentName} · {when(b.startsAt, me.timezone)}
                  </p>
                  <p className="truncate text-[13px] text-muted">{b.topic}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${
                    b.status === 'completed' ? 'bg-available/10 text-available' : 'bg-fill text-muted'
                  }`}
                >
                  {b.status === 'completed' ? 'Completed' : 'Did not take place'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-[12.5px] text-faint">Times are shown in your timezone ({me.timezone}).</p>
    </ConsoleFrame>
  );
}
