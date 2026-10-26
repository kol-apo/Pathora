'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CalendarPlus, Check, Loader2, Plus, X } from 'lucide-react';

interface Window {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

interface TimeWindow {
  startMinute: number;
  endMinute: number;
}

/** One calendar date with its own hours, or a day off. */
interface DateHours {
  date: string; // YYYY-MM-DD, in the mentor's timezone
  blocked: boolean;
  windows: TimeWindow[];
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

const dowOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/** "Mon 3 Nov 2026". Formatted in UTC so the date never shifts a day. */
const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const selectClass =
  'h-10 rounded border border-line bg-white px-3 text-[14px] text-ink focus:border-navy focus:outline-none';

/** Start and end selects plus a remove button, shared by weekly and date rows. */
function WindowRow({
  w,
  label,
  onChange,
  onRemove,
}: {
  w: TimeWindow;
  label: string;
  onChange: (patch: Partial<TimeWindow>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={w.startMinute}
        onChange={(e) => onChange({ startMinute: Number(e.target.value) })}
        aria-label={`${label} start time`}
        className={selectClass}
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
        onChange={(e) => onChange({ endMinute: Number(e.target.value) })}
        aria-label={`${label} end time`}
        className={selectClass}
      >
        {TIMES.map((t) => (
          <option key={t} value={t}>
            {fmt(t)}
          </option>
        ))}
      </select>
      <button
        onClick={onRemove}
        aria-label={`Remove ${label} ${fmt(w.startMinute)} to ${fmt(w.endMinute)}`}
        className="rounded p-2 text-faint transition-colors hover:bg-surface hover:text-ink"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/** The next window to offer after the ones already there: 09:00-12:00 first. */
function nextWindow(existing: TimeWindow[]): TimeWindow {
  const start = existing.length ? Math.max(...existing.map((w) => w.endMinute)) + 60 : 540;
  const safeStart = Math.min(start, 1260);
  return { startMinute: safeStart, endMinute: Math.min(safeStart + 180, 1320) };
}

export default function AvailabilityEditor({
  initial,
  initialDates,
  initialAccepting,
  timezone,
  today,
}: {
  initial: Window[];
  initialDates: DateHours[];
  initialAccepting: boolean;
  timezone: string;
  /** Today in the mentor's timezone, YYYY-MM-DD. */
  today: string;
}) {
  const router = useRouter();
  const [windows, setWindows] = useState<Window[]>(initial);
  const [dates, setDates] = useState<DateHours[]>(initialDates);
  const [newDate, setNewDate] = useState('');
  const [accepting, setAccepting] = useState(initialAccepting);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const update = (index: number, patch: Partial<Window>) =>
    setWindows((ws) => ws.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  const addWindow = (dow: number) => {
    const sameDay = windows.filter((w) => w.dayOfWeek === dow);
    setWindows((ws) => [...ws, { dayOfWeek: dow, ...nextWindow(sameDay) }]);
  };

  const updateDate = (date: string, patch: (d: DateHours) => DateHours) =>
    setDates((ds) => ds.map((d) => (d.date === date ? patch(d) : d)));

  const addDate = () => {
    setMessage(null);
    if (!newDate || newDate < today) {
      setMessage({ ok: false, text: 'Choose today or a later date.' });
      return;
    }
    if (dates.some((d) => d.date === newDate)) {
      setMessage({ ok: false, text: `${dateLabel(newDate)} is already in your list.` });
      return;
    }
    // Start from that weekday's usual hours, so changing one day is a small edit.
    const usual = windows
      .filter((w) => w.dayOfWeek === dowOf(newDate))
      .map(({ startMinute, endMinute }) => ({ startMinute, endMinute }));
    const entry: DateHours = { date: newDate, blocked: false, windows: usual.length ? usual : [nextWindow([])] };
    setDates((ds) => [...ds, entry].sort((a, b) => a.date.localeCompare(b.date)));
    setNewDate('');
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/mentor/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekly: windows, dates, acceptingBookings: accepting }),
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
                    <WindowRow
                      key={i}
                      w={w}
                      label={label}
                      onChange={(patch) => update(i, patch)}
                      onRemove={() => setWindows((ws) => ws.filter((_, j) => j !== i))}
                    />
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

      <section className="overflow-hidden rounded-xl border border-line">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">Specific dates</h2>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Change your hours for one date, or take a day off. A date here replaces your weekly hours for that day
            only.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={newDate}
              min={today}
              onChange={(e) => setNewDate(e.target.value)}
              aria-label="Date to add"
              className={selectClass}
            />
            <button
              onClick={addDate}
              disabled={!newDate}
              className="flex items-center gap-1.5 rounded px-3 py-2 text-[13px] font-medium text-navy transition-colors hover:bg-sky-soft disabled:opacity-50"
            >
              <CalendarPlus size={15} />
              Add date
            </button>
          </div>
        </div>
        {dates.length === 0 ? (
          <p className="px-5 py-4 text-[13.5px] text-faint">No specific dates. Your weekly hours apply every week.</p>
        ) : (
          <ul className="divide-y divide-line">
            {dates.map((d) => {
              const label = dateLabel(d.date);
              return (
                <li key={d.date} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                  <span className="w-40 shrink-0 pt-2 text-[14px] font-medium text-ink">{label}</span>
                  <div className="flex flex-1 flex-col gap-2">
                    <div role="radiogroup" aria-label={`${label} availability`} className="flex gap-1">
                      {[
                        { blocked: false, text: 'Available' },
                        { blocked: true, text: 'Day off' },
                      ].map((opt) => (
                        <button
                          key={opt.text}
                          role="radio"
                          aria-checked={d.blocked === opt.blocked}
                          onClick={() =>
                            updateDate(d.date, (x) => ({
                              ...x,
                              blocked: opt.blocked,
                              windows: !opt.blocked && x.windows.length === 0 ? [nextWindow([])] : x.windows,
                            }))
                          }
                          className={`rounded px-3 py-1.5 text-[13px] font-medium transition-colors ${
                            d.blocked === opt.blocked
                              ? 'bg-navy text-white'
                              : 'border border-line text-muted hover:bg-surface hover:text-ink'
                          }`}
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                    {d.blocked ? (
                      <span className="text-[13.5px] text-faint">No sessions can be booked on this date.</span>
                    ) : (
                      <>
                        {d.windows.map((w, i) => (
                          <WindowRow
                            key={i}
                            w={w}
                            label={label}
                            onChange={(patch) =>
                              updateDate(d.date, (x) => ({
                                ...x,
                                windows: x.windows.map((y, j) => (j === i ? { ...y, ...patch } : y)),
                              }))
                            }
                            onRemove={() =>
                              updateDate(d.date, (x) => ({ ...x, windows: x.windows.filter((_, j) => j !== i) }))
                            }
                          />
                        ))}
                        {d.windows.length === 0 && (
                          <span className="text-[13.5px] text-faint">Add hours, or mark it as a day off.</span>
                        )}
                        {d.windows.length < 4 && (
                          <button
                            onClick={() =>
                              updateDate(d.date, (x) => ({ ...x, windows: [...x.windows, nextWindow(x.windows)] }))
                            }
                            className="flex items-center gap-1.5 self-start rounded px-3 py-2 text-[13px] font-medium text-navy transition-colors hover:bg-sky-soft"
                          >
                            <Plus size={15} />
                            Add hours
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setDates((ds) => ds.filter((x) => x.date !== d.date))}
                    aria-label={`Remove ${label}`}
                    className="shrink-0 self-start rounded px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-surface hover:text-ink"
                  >
                    Remove date
                  </button>
                </li>
              );
            })}
          </ul>
        )}
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
