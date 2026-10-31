'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Star } from 'lucide-react';

const MAX = 1000;
const WORDS = ['', 'Not helpful', 'A little helpful', 'Helpful', 'Very helpful', 'Extremely helpful'];

/** Stars for a session already rated. */
export function RatedStars({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-1 text-[12.5px] text-muted" aria-label={`You rated this ${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} aria-hidden className={n <= score ? 'fill-navy text-navy' : 'text-line'} />
      ))}
      <span className="ml-1">Your rating</span>
    </span>
  );
}

/**
 * A short feedback form under a past session: stars, and an optional comment
 * that only the Pathora team reads.
 */
export default function RateSession({ bookingId, mentorFirstName }: { bookingId: string; mentorFirstName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-line px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
      >
        Rate session
      </button>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, comment: comment.trim() || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(data.error ?? 'Could not save your feedback.');
  };

  const shown = hover || score;
  return (
    <div className="w-full rounded-lg bg-surface p-4">
      <p className="text-[14px] font-medium text-ink">How helpful was your session with {mentorFirstName}?</p>
      <div className="mt-2 flex items-center gap-3">
        <div role="radiogroup" aria-label="Rating" className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={score === n}
              aria-label={`${n} star${n === 1 ? '' : 's'}: ${WORDS[n]}`}
              onClick={() => setScore(n)}
              onMouseEnter={() => setHover(n)}
              className="p-1"
            >
              <Star size={24} className={n <= shown ? 'fill-navy text-navy' : 'text-faint'} />
            </button>
          ))}
        </div>
        <span className="text-[13px] text-muted">{WORDS[shown]}</span>
      </div>
      <label className="mt-3 block">
        <span className="text-[13px] text-muted">
          Anything to add? (optional) Only the Pathora team reads this, not {mentorFirstName}.
        </span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX))}
          rows={3}
          className="mt-1.5 w-full resize-y rounded border border-line bg-white px-3 py-2 text-[14px] text-ink focus:border-navy focus:outline-none"
          placeholder="What was useful? What could be better?"
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 flex items-center gap-2 text-[13px] text-ink">
          <AlertCircle size={15} /> {error}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={busy || score === 0}
          className="flex items-center gap-2 rounded bg-navy px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-50"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          Send feedback
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:text-ink"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
