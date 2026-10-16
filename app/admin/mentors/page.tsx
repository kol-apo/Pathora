import Link from 'next/link';
import ConsoleFrame from '@/components/console/ConsoleFrame';
import MentorReviewCard from '@/components/console/MentorReviewCard';
import { countMentorsByStatus, listMentorsForReview } from '@/lib/db/queries/admin';
import { MENTOR_STATUSES, type MentorStatus } from '@/lib/db/models/MentorProfile';

export const metadata = { title: 'Mentors · Admin · Pathora' };
export const dynamic = 'force-dynamic';

const LABELS: Record<MentorStatus, string> = {
  pending_review: 'Applications',
  approved: 'Approved',
  suspended: 'Suspended',
  rejected: 'Rejected',
};

const EMPTY: Record<MentorStatus, string> = {
  pending_review: 'No applications waiting. New ones from “Become a mentor” appear here.',
  approved: 'No approved mentors yet.',
  suspended: 'No suspended mentors.',
  rejected: 'No rejected applications.',
};

export default async function AdminMentorsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status: MentorStatus = MENTOR_STATUSES.includes(searchParams.status as MentorStatus)
    ? (searchParams.status as MentorStatus)
    : 'pending_review';
  const [mentors, counts] = await Promise.all([listMentorsForReview(status), countMentorsByStatus()]);

  return (
    <ConsoleFrame
      variant="admin"
      title="Mentors"
      subtitle="Approve applications, set each mentor’s interest profile, and suspend anyone who should no longer take sessions."
    >
      <nav className="flex flex-wrap gap-2" aria-label="Mentor status">
        {(['pending_review', 'approved', 'suspended', 'rejected'] as MentorStatus[]).map((s) => (
          <Link
            key={s}
            href={`/admin/mentors?status=${s}`}
            aria-current={s === status ? 'page' : undefined}
            className={`rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors ${
              s === status ? 'bg-navy text-white' : 'border border-line text-ink hover:bg-sky-soft'
            }`}
          >
            {LABELS[s]} <span className={s === status ? 'text-white/70' : 'text-faint'}>{counts[s]}</span>
          </Link>
        ))}
      </nav>

      {mentors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center text-sm text-muted">
          {EMPTY[status]}
        </div>
      ) : (
        <div className="space-y-4">
          {mentors.map((m) => (
            <MentorReviewCard key={m.id} mentor={m} />
          ))}
        </div>
      )}
    </ConsoleFrame>
  );
}
