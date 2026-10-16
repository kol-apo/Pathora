'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Loader2, Plus, X } from 'lucide-react';

interface Window {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

// Monday first, the way most people think about a working week.
const DAYS = [
  { dow: 1, label: 'Monday' },
  { dow: 2, label: 'Tuesday' },
  { dow: 3, label: 'Wednesday' },
  { dow: 4, label: 'Thursday' },
  { dow: 5, label: 'Friday' },
  { dow: 6, label: 'Saturday' },
  { dow: 0, label: 'Sunday' },
];

/** Every half hour from 06:00 to 22:00. */
const TIMES = Array.from({ length: 33 }, (_, i) => 360 + i * 30);
const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export default function AvailabilityEditor({
  initial,
  initialAccepting,
  timezone,
}: {
  initial: Window[];
  initialAccepting: boolean;
  timezone: string;
}) {
  const router = useRouter();
  const [windows, setWindows] = useState<Window[]>(initial);
  const [accepting, setAccepting] = useState(initialAccepting);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const update = (index: number, patch: Partial<Window>) =>
    setWindows((ws) => ws.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  const addWindow = (dow: number) => {
    const sameDay = windows.filter((w) => w.dayOfWeek === dow);
    const start = sameDay.length ? Math.max(...sameDay.map((w) => w.endMinute)) + 60 : 540;
    const safeStart = Math.min(start, 1260);
    setWindows((ws) => [...ws, { dayOfWeek: dow, startMinute: safeStart, endMinute: Math.min(safeStart + 180, 1320) }]);
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/mentor/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekly: windows, acceptingBookings: accepting }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMessage(res.ok ? { ok: true, text: 'Saved. Students now see these times.' } : { ok: false, text: data.error ?? 'Could not save.' });
    if (res.ok) router.refresh();
  };

  return (
    <div className="space-y-6">
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line p-5">
        <span>
          <span className="block text-[15px] font-semibold text-ink">Accepting new bookings</span>
          <span className="text-[13.5px] text-muted">Turn this off to pause new requests without changing your hours.</span>
        </span>
        <input
          type="checkbox"
          checked={accepting}
          onChange={(e) => setAccepting(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-[#1D3F5A]"
        />
      </label>

      <section className="overflow-hidden rounded-xl border border-line">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">Weekly hours</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            In your timezone, {timezone}. Sessions are 45 minutes with a 15-minute break between them.
          </p>
        </div>
        <ul className="divide-y divide-line">
          {DAYS.map(({ dow, label }) => {
            const entries = windows.map((w, i) => ({ w, i })).filter(({ w }) => w.dayOfWeek === dow);
            return (
              <li key={dow} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                <span className="w-28 shrink-0 pt-2 text-[14px] font-medium text-ink">{label}</span>
                <div className="flex flex-1 flex-col gap-2">
                  {entries.length === 0 && <span className="pt-2 text-[13.5px] text-faint">Unavailable</span>}
                  {entries.map(({ w, i }) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <select
                        value={w.startMinute}
                        onChange={(e) => update(i, { startMinute: Number(e.target.value) })}
                        aria-label={`${label} start time`}
                        className="h-10 rounded border border-line bg-white px-3 text-[14px] text-ink focus:border-navy focus:outline-none"
                      >
                        {TIMES.map((t) => (
                          <option key={t} value={t}>
                            {fmt(t)}
                          </option>
                        ))}
                      </select>
                      <span className="text-[13px] text-muted">to</span>
                      <select
                        value={w.endMinute}
                        onChange={(e) => update(i, { endMinute: Number(e.target.value) })}
                        aria-label={`${label} end time`}
                        className="h-10 rounded border border-line bg-white px-3 text-[14px] text-ink focus:border-navy focus:outline-none"
                      >
                        {TIMES.map((t) => (
                          <option key={t} value={t}>
                            {fmt(t)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setWindows((ws) => ws.filter((_, j) => j !== i))}
                        aria-label={`Remove ${label} ${fmt(w.startMinute)} to ${fmt(w.endMinute)}`}
                        className="rounded p-2 text-faint transition-colors hover:bg-surface hover:text-ink"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addWindow(dow)}
                  className="flex shrink-0 items-center gap-1.5 self-start rounded px-3 py-2 text-[13px] font-medium text-navy transition-colors hover:bg-sky-soft"
                >
                  <Plus size={15} />
                  Add hours
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          onClick={save}
          disabled={busy}
          className="flex items-center gap-2 rounded bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Save hours
        </button>
        {message && (
          <p role="status" className="flex items-center gap-2 text-[13.5px] text-ink">
            {message.ok ? <Check size={15} className="text-available" /> : <AlertCircle size={15} />}
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
