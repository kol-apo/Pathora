import Link from 'next/link';
import type { UpcomingSession as UpcomingSessionType } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';

export default function UpcomingSession({ session }: { session: UpcomingSessionType }) {
  const c = session.consultant;
  return (
    <section className="on-dark flex flex-col gap-6 rounded-lg bg-ink p-[26px] md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-[18px]">
        <Avatar initials={c.initials} size="lg" tone="dark" className="hidden sm:inline-flex" />
        <div className="flex flex-col gap-[5px]">
          <span className="text-micro font-semibold uppercase tracking-[0.08em] text-white/55">
            Upcoming session
          </span>
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-white">
            {c.name} · {session.topic}
          </h2>
          <p className="text-[13.5px] text-white/65">
            {session.when} · {session.duration} · {session.format}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <button className="rounded border border-white/20 px-[18px] py-[11px] text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
          Reschedule
        </button>
        <Link
          href={`/session/${c.id}`}
          className="rounded bg-white px-5 py-[11px] text-sm font-medium text-ink transition-colors hover:bg-white/90"
        >
          Join session
        </Link>
      </div>
    </section>
  );
}
