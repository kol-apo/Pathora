'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Cancel a session, with a second click to confirm. The slot opens for other
 * students straight away, so the page reloads its data afterwards.
 */
export default function CancelBookingButton({
  bookingId,
  mentorFirstName,
  tone = 'light',
}: {
  bookingId: string;
  mentorFirstName: string;
  /** 'dark' when it sits on the navy session card. */
  tone?: 'light' | 'dark';
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base =
    tone === 'dark'
      ? 'rounded border border-white/20 px-[18px] py-[11px] text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white'
      : 'rounded border border-line px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface';
  const errorTone = tone === 'dark' ? 'text-white/80' : 'text-ink';

  const cancel = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' }).catch(() => null);
    if (res?.ok) {
      router.refresh();
      return;
    }
    const data = await res?.json().catch(() => ({}));
    setError(data?.error ?? 'Could not cancel. Please try again.');
    setBusy(false);
    setConfirming(false);
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      {confirming && (
        <p className={`text-[12.5px] ${tone === 'dark' ? 'text-white/70' : 'text-muted'}`}>
          Cancel your session with {mentorFirstName}?
        </p>
      )}
      {confirming ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={base}>
            Keep it
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className={`${base} inline-flex items-center gap-1.5`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Yes, cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={base}>
          Cancel session
        </button>
      )}
      {error && (
        <p role="alert" className={`text-[12px] ${errorTone}`}>
          {error}
        </p>
      )}
    </div>
  );
}
