'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/** After a confirmed session's start time: did it take place? */
export default function SessionOutcome({ bookingId, studentName }: { bookingId: string; studentName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'complete' | 'no_show' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const record = async (action: 'complete' | 'no_show') => {
    if (action === 'no_show' && !window.confirm(`Record that the session with ${studentName} did not take place?`)) return;
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/mentor/bookings/${bookingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) {
      setError((await res?.json().catch(() => ({})))?.error ?? 'Could not save that. Please try again.');
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <button
          onClick={() => record('no_show')}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded border border-line px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface disabled:opacity-50"
        >
          {busy === 'no_show' && <Loader2 size={14} className="animate-spin" />}
          Didn&apos;t happen
        </button>
        <button
          onClick={() => record('complete')}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded bg-navy px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-50"
        >
          {busy === 'complete' && <Loader2 size={14} className="animate-spin" />}
          Completed
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[12.5px] text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
