'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import ProfileLinks from '@/components/consultant/ProfileLinks';
import { VECTOR_AXES } from '@/lib/matching/similarity';
import type { MentorReviewDTO, ReviewAction } from '@/lib/db/queries/admin';

const ACTIONS: Record<MentorReviewDTO['status'], { action: ReviewAction; label: string; primary?: boolean }[]> = {
  pending_review: [
    { action: 'approve', label: 'Approve', primary: true },
    { action: 'reject', label: 'Reject' },
  ],
  approved: [{ action: 'suspend', label: 'Suspend' }],
  suspended: [{ action: 'reinstate', label: 'Reinstate', primary: true }],
  rejected: [{ action: 'approve', label: 'Approve after all', primary: true }],
};

/** One mentor, with their application details, interest profile and review actions. */
export default function MentorReviewCard({ mentor }: { mentor: MentorReviewDTO }) {
  const router = useRouter();
  const [vector, setVector] = useState<number[]>(mentor.profileVector ?? [0.5, 0.5, 0.5, 0.5, 0.5]);
  const [busy, setBusy] = useState<ReviewAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(mentor.status === 'pending_review');
  const editable = mentor.status !== 'approved';

  const act = async (action: ReviewAction) => {
    if (action === 'reject' && !window.confirm(`Reject ${mentor.displayName}'s application?`)) return;
    if (action === 'suspend' && !window.confirm(`Suspend ${mentor.displayName}? They will be hidden from students.`)) return;
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/admin/mentors/${mentor.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        action === 'approve' || action === 'reinstate' ? { action, profileVector: vector } : { action },
      ),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? 'Could not update this mentor.');
      return;
    }
    router.refresh();
  };

  return (
    <article className="rounded-xl border border-line">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3.5">
          <Avatar initials={mentor.initials} size="md" />
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-ink">{mentor.displayName}</p>
            <p className="text-[13.5px] text-muted">
              {mentor.role} · {mentor.company}
              {mentor.country ? ` · ${mentor.country}` : ''}
            </p>
            <p className="mt-0.5 text-[12.5px] text-faint">
              {mentor.email} · applied {new Date(mentor.appliedAt).toLocaleDateString('en-GB')}
              {mentor.approvedBy ? ` · approved by ${mentor.approvedBy}` : ''}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Badge variant="sector">{mentor.sector}</Badge>
              <Badge variant="tag">{mentor.experience} years</Badge>
              {mentor.codeOfConductOk && <Badge variant="tag">Code of conduct agreed</Badge>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded border border-line px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
          >
            {open ? 'Hide details' : 'Review'}
          </button>
          {ACTIONS[mentor.status].map((a) => (
            <button
              key={a.action}
              onClick={() => act(a.action)}
              disabled={busy !== null}
              className={`flex items-center gap-1.5 rounded px-3.5 py-2 text-[13px] font-medium transition-colors disabled:opacity-50 ${
                a.primary ? 'bg-navy text-white hover:bg-navy-deep' : 'border border-line text-ink hover:bg-surface'
              }`}
            >
              {busy === a.action && <Loader2 size={14} className="animate-spin" />}
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mx-5 mb-4 flex gap-2 rounded-lg bg-surface p-3 text-[13px] text-ink">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {open && (
        <div className="grid gap-6 border-t border-line p-5 md:grid-cols-2">
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">About</p>
              <p className="mt-1 leading-relaxed text-ink">{mentor.bio}</p>
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">Can help with</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink">
                {mentor.helpWith.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">Links</p>
              {mentor.socials.linkedin || mentor.socials.x || mentor.links.length ? (
                <div className="mt-2">
                  <ProfileLinks name={mentor.displayName} socials={mentor.socials} links={mentor.links} />
                </div>
              ) : (
                <p className="mt-1 text-muted">None given. Consider asking for a LinkedIn profile before approving.</p>
              )}
            </div>
            {mentor.focus.length + mentor.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {[...mentor.focus, ...mentor.tags].map((t) => (
                  <Badge key={t} variant="tag">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">Interest profile</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              Where this mentor sits on each axis. Students are matched to mentors by how closely these profiles
              point the same way.{editable ? '' : ' Locked while approved; suspend to change it.'}
            </p>
            <div className="mt-4 space-y-3.5">
              {VECTOR_AXES.map((axis, i) => (
                <label key={axis.name} className="block">
                  <span className="flex items-baseline justify-between text-[13px]">
                    <span className="font-medium text-ink">
                      {axis.label} <span className="font-normal text-faint">· {axis.description}</span>
                    </span>
                    <span className="tabular-nums text-navy">{vector[i].toFixed(2)}</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={vector[i]}
                    disabled={!editable}
                    onChange={(e) =>
                      setVector((v) => v.map((x, j) => (j === i ? Number(e.target.value) : x)))
                    }
                    className="mt-1.5 w-full accent-[#1D3F5A] disabled:opacity-50"
                    aria-label={`${axis.label} score`}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
