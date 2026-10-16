'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/** Confirm or decline a pending booking request. */
export default function BookingResponse({ bookingId, studentName }: { bookingId: string; studentName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'confirm' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (action: 'confirm' | 'decline') => {
    if (action === 'decline' && !window.confirm(`Decline ${studentName}'s request? The slot opens up again.`)) return;
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/mentor/bookings/${bookingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? 'Could not update this request.');
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <button
          onClick={() => respond('decline')}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded border border-line px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface disabled:opacity-50"
        >
          {busy === 'decline' && <Loader2 size={14} className="animate-spin" />}
          Decline
        </button>
        <button
          onClick={() => respond('confirm')}
          disabled={busy !== null}
          className="flex items-center gap-1.5 rounded bg-navy px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-50"
        >
          {busy === 'confirm' && <Loader2 size={14} className="animate-spin" />}
          Confirm
        </button>
      </div>
      {error && <p className="text-[12.5px] text-ink">{error}</p>}
    </div>
  );
}
