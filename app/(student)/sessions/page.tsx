import Link from 'next/link';
import { auth } from '@/auth';
import { listBookingsForStudent } from '@/lib/db/queries/bookings';
import type { BookingDTO, MentorDTO } from '@/lib/db/queries/dto';
import SessionsBoard from '@/components/sessions/SessionsBoard';

export const metadata = { title: 'Sessions · Pathora' };
export const dynamic = 'force-dynamic';

/** Every session the student has booked: today, coming up, and past. */
export default async function SessionsPage() {
  const session = await auth();
  const bookings = session?.user?.id ? await listBookingsForStudent(session.user.id, { limit: 200 }) : [];
  const withMentor = bookings.filter((b): b is BookingDTO & { mentor: MentorDTO } => typeof b.mentor !== 'string');

  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-7 px-5 pb-16 pt-10 md:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-ink md:text-[30px]">Sessions</h1>
          <p className="mt-2 text-[15px] text-muted">Free 45-minute video sessions with your mentors.</p>
        </div>
        <Link
          href="/explore"
          className="self-start rounded bg-navy px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-deep sm:self-auto"
        >
          Book a session
        </Link>
      </header>
      <SessionsBoard bookings={withMentor} />
    </main>
  );
}
