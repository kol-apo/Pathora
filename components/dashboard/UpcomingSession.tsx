import Link from 'next/link';
import { Video } from 'lucide-react';
import type { UpcomingSession as UpcomingSessionType } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';

export default function UpcomingSession({ session }: { session: UpcomingSessionType }) {
  const c = session.consultant;
  return (
    <section className="rounded-2xl bg-navy p-6 text-white md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar initials={c.initials} color={c.avatarColor} size="lg" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.8px] text-amber">
              Upcoming session · In 3 days
            </p>
            <p className="mt-1 font-fraunces text-xl font-bold">{c.name}</p>
            <p className="text-sm text-white/70">
              {c.role} · {c.company}
            </p>
            <p className="mt-2 text-sm text-white/85">
              {session.date} · {session.time} · {session.duration}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`/session/${c.id}`}
            className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-amber px-6 text-sm font-semibold text-white transition-all duration-[180ms] hover:scale-[1.02] hover:bg-amber-dark active:scale-[0.98]"
          >
            <Video size={16} />
            Join Session
          </Link>
          <button className="text-sm font-medium text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline">
            Reschedule
          </button>
        </div>
      </div>
    </section>
  );
}
