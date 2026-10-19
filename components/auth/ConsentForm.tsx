'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

/** Research consent: read, tick, agree. Then straight to the dashboard. */
export default function ConsentForm({
  title,
  points,
  agreement,
  version,
  isDraft,
}: {
  title: string;
  points: string[];
  agreement: string;
  version: string;
  isDraft: boolean;
}) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agree: agreed, version }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Could not save your answer. Please try again.');
      setBusy(false);
      return;
    }
    // Straight into the app: the dashboard points them to Pathy from there.
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <form onSubmit={submit}>
      {isDraft && (
        <p className="mb-4 rounded-md bg-sky-soft px-3 py-2 text-[12px] text-navy">
          Draft wording: the final consent form will replace this text.
        </p>
      )}
      <div className="rounded-xl border border-sky-muted bg-white p-5">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        <ul className="mt-3 space-y-2.5">
          {points.map((p) => (
            <li key={p} className="flex gap-2.5 text-[14px] leading-relaxed text-ink">
              <Check size={15} strokeWidth={2.25} className="mt-1 shrink-0 text-navy" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div role="alert" className="mt-4 flex gap-2.5 rounded-lg border border-line bg-surface p-3.5 text-[13.5px] text-ink">
          <AlertCircle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-line p-4 transition-colors hover:border-navy">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#1D3F5A]"
        />
        <span className="text-[14px] font-medium text-ink">{agreement}</span>
      </label>

      <button
        type="submit"
        disabled={!agreed || busy}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded bg-navy text-[15px] font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-40"
      >
        {busy && <Loader2 size={17} className="animate-spin" />}
        Agree and continue
      </button>
      <p className="mt-3 text-center text-[12px] text-faint">Consent version {version}</p>
    </form>
  );
}
