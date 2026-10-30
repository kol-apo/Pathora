'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { sameStarts, startsFromWindows, windowsFromStarts, type TimeWindow } from '@/lib/booking/hourGrid';

interface WeeklyWindow extends TimeWindow {
  dayOfWeek: number;
}

/** One calendar date with its own hours, or a day off, as the server sends it. */
interface DateHours {
  date: string; // YYYY-MM-DD, in the mentor's timezone
  blocked: boolean;
  windows: TimeWindow[];
}

/** A date that differs from the usual week, as the editor holds it. */
interface Override {
  blocked: boolean;
  starts: number[];
}

// Monday first, the way most people think about a working week.
const DAYS = [
  { dow: 1, short: 'Mon', long: 'Monday' },
  { dow: 2, short: 'Tue', long: 'Tuesday' },
  { dow: 3, short: 'Wed', long: 'Wednesday' },
  { dow: 4, short: 'Thu', long: 'Thursday' },
  { dow: 5, short: 'Fri', long: 'Friday' },
  { dow: 6, short: 'Sat', long: 'Saturday' },
  { dow: 0, short: 'Sun', long: 'Sunday' },
];
const LONG_DAY = Object.fromEntries(DAYS.map((d) => [d.dow, d.long]));

/** Session start times offered by default: every hour from 06:00 to 21:00. */
const DEFAULT_HOURS = Array.from({ length: 16 }, (_, i) => 360 + i * 60);
const WORKDAY = [540, 600, 660, 720, 780, 840, 900, 960]; // 09:00-17:00
const MAX_DAYS_AHEAD = 365;

/** Must match NOTICE_HOURS in lib/db/queries/mentorConsole.ts. */
const NOTICE_OPTIONS = [
  { hours: 0.5, label: '30 minutes' },
  { hours: 1, label: '1 hour' },
  { hours: 3, label: '3 hours' },
  { hours: 12, label: '12 hours' },
  { hours: 24, label: '1 day' },
  { hours: 48, label: '2 days' },
];
const noticeLabel = (h: number) =>
  NOTICE_OPTIONS.find((o) => o.hours === h)?.label ?? (h % 24 === 0 ? `${h / 24} days` : `${h} hours`);
/** "1 day's notice", "2 days' notice". */
const noticeOf = (h: number) => {
  const l = noticeLabel(h);
  return `${l}${l.endsWith('s') ? "'" : "'s"} notice`;
};

/** The local date and minute-of-day of an instant in a timezone. */
function zonedNow(instant: Date, timeZone: string): { date: string; minute: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minute: Number(parts.hour) * 60 + Number(parts.minute) };
}

const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const isoOf = (dt: Date) => dt.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const dt = toUTC(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return isoOf(dt);
};
const dowOf = (iso: string) => toUTC(iso).getUTCDay();
/** Formatted in UTC so a date never shifts by a day. */
const label = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  toUTC(iso).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });

function weekFromWindows(windows: WeeklyWindow[]): Record<number, number[]> {
  const week: Record<number, number[]> = {};
  for (const { dow } of DAYS) {
    week[dow] = startsFromWindows(windows.filter((w) => w.dayOfWeek === dow));
  }
  return week;
}

const toggle = (list: number[], m: number, on: boolean) =>
  on ? [...new Set([...list, m])].sort((a, b) => a - b) : list.filter((x) => x !== m);

export default function AvailabilityEditor({
  initial,
  initialDates,
  initialAccepting,
  timezone,
  today,
  initialNoticeHours,
  horizonDays,
  status,
  nextSlotLabel,
}: {
  initial: WeeklyWindow[];
  initialDates: DateHours[];
  initialAccepting: boolean;
  timezone: string;
  /** Today in the mentor's timezone, YYYY-MM-DD. */
  today: string;
  initialNoticeHours: number;
  horizonDays: number;
  status: 'pending_review' | 'approved' | 'rejected' | 'suspended';
  /** The first time students can book now (saved state), already formatted. */
  nextSlotLabel: string | null;
}) {
  const router = useRouter();
  const [week, setWeek] = useState(() => weekFromWindows(initial));
  const [overrides, setOverrides] = useState<Record<string, Override>>(() =>
    Object.fromEntries(
      initialDates.map((d) => [d.date, { blocked: d.blocked, starts: d.blocked ? [] : startsFromWindows(d.windows) }]),
    ),
  );
  const [accepting, setAccepting] = useState(initialAccepting);
  const [notice, setNotice] = useState(initialNoticeHours);
  const [selected, setSelected] = useState<string | null>(null);
  const [month, setMonth] = useState(today.slice(0, 7)); // YYYY-MM
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // The hours shown: 06:00-21:00, plus any odd start time already saved.
  const hours = useMemo(() => {
    const saved = [
      ...Object.values(weekFromWindows(initial)).flat(),
      ...initialDates.flatMap((d) => startsFromWindows(d.windows)),
    ];
    return [...new Set([...DEFAULT_HOURS, ...saved])].sort((a, b) => a - b);
  }, [initial, initialDates]);

  const payload = (w: typeof week, o: typeof overrides, a: boolean, n: number) => ({
    acceptingBookings: a,
    noticeHours: n,
    weekly: DAYS.flatMap(({ dow }) => windowsFromStarts(w[dow]).map((x) => ({ dayOfWeek: dow, ...x }))),
    dates: Object.entries(o)
      .filter(([date]) => date >= today)
      .sort(([a1], [b1]) => a1.localeCompare(b1))
      .map(([date, x]) => ({ date, blocked: x.blocked, windows: x.blocked ? [] : windowsFromStarts(x.starts) })),
  });
  const [savedState, setSavedState] = useState(() =>
    JSON.stringify(payload(weekFromWindows(initial), overrides, initialAccepting, initialNoticeHours)),
  );
  const current = JSON.stringify(payload(week, overrides, accepting, notice));
  const dirty = current !== savedState;

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const body = current;
    const res = await fetch('/api/mentor/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setSavedState(body);
      setMessage({ ok: true, text: 'Saved. Students now see these times.' });
      router.refresh();
    } else {
      setMessage({ ok: false, text: data.error ?? 'Could not save.' });
    }
  };

  // ── Usual week: tap a cell, or drag across cells with a mouse ──────────────
  const paint = useRef<boolean | null>(null);
  const skipClick = useRef(false);
  useEffect(() => {
    const stop = () => (paint.current = null);
    window.addEventListener('pointerup', stop);
    return () => window.removeEventListener('pointerup', stop);
  }, []);
  const setCell = (dow: number, m: number, on: boolean) => {
    setMessage(null);
    setWeek((w) => ({ ...w, [dow]: toggle(w[dow], m, on) }));
  };
  const sessionsPerWeek = DAYS.reduce((n, { dow }) => n + week[dow].length, 0);

  // ── Specific dates ─────────────────────────────────────────────────────────
  const lastDay = addDays(today, MAX_DAYS_AHEAD);
  const usualFor = (date: string) => week[dowOf(date)];
  const stateOf = (date: string): 'off' | 'changed' | 'open' | 'closed' => {
    const o = overrides[date];
    if (o?.blocked) return 'off';
    if (o) return 'changed';
    return usualFor(date).length ? 'open' : 'closed';
  };
  const startsOn = (date: string) => overrides[date]?.starts ?? usualFor(date);

  const setDate = (date: string, next: Override | null) => {
    setMessage(null);
    setOverrides((o) => {
      const copy = { ...o };
      if (next === null) delete copy[date];
      else copy[date] = next;
      return copy;
    });
  };
  const toggleDateHour = (date: string, m: number) => {
    const current = startsOn(date);
    const next = toggle(current, m, !current.includes(m));
    if (sameStarts(next, usualFor(date))) setDate(date, null);
    else if (next.length === 0) setDate(date, { blocked: true, starts: [] });
    else setDate(date, { blocked: false, starts: next });
  };

  const monthStart = `${month}-01`;
  const lead = (dowOf(monthStart) + 6) % 7; // blank cells before the 1st, Monday first
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i)),
  ];
  const shiftMonth = (n: number) => {
    const dt = toUTC(monthStart);
    dt.setUTCMonth(dt.getUTCMonth() + n);
    setMonth(isoOf(dt).slice(0, 7));
  };
  const canGoBack = month > today.slice(0, 7);
  const canGoForward = month < lastDay.slice(0, 7);

  const changed = Object.entries(overrides)
    .filter(([date]) => date >= today)
    .sort(([a], [b]) => a.localeCompare(b));

  // What students see, from the saved hours (the page reloads after a save).
  const savedHasHours = initial.length > 0 || initialDates.some((d) => !d.blocked && d.windows.length > 0);
  const bookable = status === 'approved' && initialAccepting && nextSlotLabel !== null;
  const statusTitle = bookable
    ? 'Students can book you'
    : status === 'pending_review'
      ? 'Waiting for approval'
      : status !== 'approved'
        ? 'Your profile is hidden from students'
        : 'Students cannot book you yet';
  const statusDetail = bookable
    ? `The next time they can book is ${nextSlotLabel} (${timezone}).`
    : status === 'pending_review'
      ? 'An admin is reviewing your profile. Students will see your hours once it is approved.'
      : status !== 'approved'
        ? 'Contact the Pathora team if you think this is a mistake.'
        : !initialAccepting
          ? 'You have paused new bookings. Turn "Accepting new bookings" back on and save.'
          : !savedHasHours
            ? 'Add the hours you are free below, then save.'
            : `None of your saved hours are open: each needs ${noticeOf(initialNoticeHours)}, and students can book up to ${horizonDays} days ahead. Add later hours or shorten the notice.`;

  const cellClass: Record<ReturnType<typeof stateOf>, string> = {
    open: 'bg-sky-soft text-navy font-medium',
    changed: 'bg-sky-soft text-navy font-medium',
    off: 'text-faint line-through',
    closed: 'text-muted',
  };

  return (
    <div className="space-y-6">
      {/* ── What students see right now ─────────────────────────────── */}
      <section className="rounded-xl border border-line">
        <div
          role="status"
          aria-label="Booking status"
          className={`flex items-start gap-3 rounded-t-xl px-5 py-4 ${bookable ? 'bg-sky-soft' : 'bg-surface'}`}
        >
          <span
            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${bookable ? 'bg-available' : 'bg-faint'}`}
            aria-hidden
          />
          <div>
            <p className="text-[15px] font-semibold text-ink">{statusTitle}</p>
            <p className="mt-0.5 text-[13.5px] text-muted">{statusDetail}</p>
          </div>
        </div>
        <div className="divide-y divide-line border-t border-line">
          <label className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
            <span>
              <span className="block text-[14px] font-medium text-ink">Accepting new bookings</span>
              <span className="text-[13px] text-muted">Turn this off to pause new requests without changing your hours.</span>
            </span>
            <input
              type="checkbox"
              checked={accepting}
              onChange={(e) => setAccepting(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-[#1D3F5A]"
            />
          </label>
          <label className="flex items-center justify-between gap-4 px-5 py-4">
            <span>
              <span className="block text-[14px] font-medium text-ink">Minimum notice</span>
              <span className="text-[13px] text-muted">
                How soon before a session students can still book it. You confirm each request.
              </span>
            </span>
            <select
              value={notice}
              onChange={(e) => {
                setMessage(null);
                setNotice(Number(e.target.value));
              }}
              className="h-10 shrink-0 rounded border border-line bg-white px-3 text-[14px] text-ink focus:border-navy focus:outline-none"
            >
              {!NOTICE_OPTIONS.some((o) => o.hours === initialNoticeHours) && (
                <option value={initialNoticeHours}>{noticeLabel(initialNoticeHours)}</option>
              )}
              {NOTICE_OPTIONS.map((o) => (
                <option key={o.hours} value={o.hours}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* ── 1. Usual week ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-line">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">1. Your usual week</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Tap the hours you are free. Each hour is one 45-minute session. Times are in {timezone}.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setWeek((w) => ({ ...w, 1: WORKDAY, 2: WORKDAY, 3: WORKDAY, 4: WORKDAY, 5: WORKDAY }))}
              className="rounded border border-line px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
            >
              Weekdays 9 to 5
            </button>
            <button
              onClick={() => setWeek(Object.fromEntries(DAYS.map(({ dow }) => [dow, []])))}
              className="rounded border border-line px-3 py-1.5 text-[13px] font-medium text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="select-none px-3 py-4 sm:px-5">
          <div className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] gap-1">
            <span />
            {DAYS.map((d) => (
              <span key={d.dow} className="pb-1 text-center text-[12px] font-semibold text-ink">
                {d.short}
              </span>
            ))}
            {hours.map((m) => (
              <div key={m} className="contents">
                <span className="flex items-center text-[11.5px] tabular-nums text-muted">{fmt(m)}</span>
                {DAYS.map((d) => {
                  const on = week[d.dow].includes(m);
                  return (
                    <button
                      key={d.dow}
                      aria-pressed={on}
                      aria-label={`${d.long} ${fmt(m)}`}
                      onPointerDown={(e) => {
                        if (e.pointerType !== 'mouse' || e.button !== 0) return;
                        skipClick.current = true;
                        paint.current = !on;
                        setCell(d.dow, m, !on);
                      }}
                      onPointerEnter={(e) => {
                        if (e.pointerType === 'mouse' && paint.current !== null) setCell(d.dow, m, paint.current);
                      }}
                      onClick={() => {
                        if (skipClick.current) {
                          skipClick.current = false;
                          return;
                        }
                        setCell(d.dow, m, !on);
                      }}
                      className={`h-8 rounded transition-colors ${
                        on ? 'bg-navy hover:bg-navy-deep' : 'bg-fill hover:bg-sky-muted'
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-muted">
            {sessionsPerWeek === 0
              ? 'No hours yet. Students cannot book you until you add some.'
              : `${sessionsPerWeek} session${sessionsPerWeek === 1 ? '' : 's'} a week.`}
          </p>
        </div>
      </section>

      {/* ── 2. Specific dates ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-line">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">2. Specific dates (optional)</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Tap a date to take it off or change its hours. Every other date follows your usual week.
          </p>
        </div>

        <div className="grid gap-6 px-5 py-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          {/* Calendar */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={() => shiftMonth(-1)}
                disabled={!canGoBack}
                aria-label="Previous month"
                className="rounded p-1.5 text-ink transition-colors hover:bg-surface disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-[14px] font-semibold text-ink">
                {label(monthStart, { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => shiftMonth(1)}
                disabled={!canGoForward}
                aria-label="Next month"
                className="rounded p-1.5 text-ink transition-colors hover:bg-surface disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {DAYS.map((d) => (
                <span key={d.dow} className="pb-1 text-[11.5px] font-medium text-muted">
                  {d.short.slice(0, 2)}
                </span>
              ))}
              {cells.map((date, i) => {
                if (!date) return <span key={`b${i}`} />;
                const outOfRange = date < today || date > lastDay;
                const state = stateOf(date);
                const isSelected = selected === date;
                return (
                  <button
                    key={date}
                    disabled={outOfRange}
                    onClick={() => setSelected(isSelected ? null : date)}
                    aria-pressed={isSelected}
                    aria-label={`${label(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${
                      { open: 'open', changed: 'changed hours', off: 'day off', closed: 'no hours' }[state]
                    }`}
                    className={`relative flex h-10 items-center justify-center rounded text-[13.5px] tabular-nums transition-colors disabled:cursor-default disabled:bg-transparent disabled:text-line ${
                      isSelected ? 'bg-navy font-semibold text-white' : `${cellClass[state]} hover:ring-1 hover:ring-navy`
                    }`}
                  >
                    {Number(date.slice(8))}
                    {state === 'changed' && !outOfRange && (
                      <span
                        className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-navy'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-sky-soft ring-1 ring-sky-muted" /> Open
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-navy" /> Changed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="line-through">12</span> Day off
              </span>
            </div>
          </div>

          {/* The chosen date */}
          <div className="min-w-0">
            {selected ? (
              <DatePanel
                date={selected}
                state={stateOf(selected)}
                usual={usualFor(selected)}
                starts={startsOn(selected)}
                hours={hours}
                timezone={timezone}
                noticeHours={notice}
                horizonDays={horizonDays}
                onToggle={(m) => toggleDateHour(selected, m)}
                onDayOff={() => setDate(selected, { blocked: true, starts: [] })}
                onReset={() => setDate(selected, null)}
              />
            ) : (
              <div className="flex h-full flex-col justify-center rounded-lg bg-surface p-5 text-[13.5px] text-muted">
                <p>Pick a date on the calendar.</p>
                {changed.length > 0 && (
                  <>
                    <p className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-ink">Your changed dates</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {changed.map(([date, o]) => (
                        <li key={date}>
                          <button
                            onClick={() => {
                              setSelected(date);
                              setMonth(date.slice(0, 7));
                            }}
                            className="rounded-full border border-line bg-white px-3 py-1 text-[12.5px] text-ink transition-colors hover:border-navy"
                          >
                            {label(date, { weekday: 'short', day: 'numeric', month: 'short' })}
                            <span className="text-muted">
                              {' · '}
                              {o.blocked ? 'Day off' : `${o.starts.length} session${o.starts.length === 1 ? '' : 's'}`}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Save: stays in view while there are changes. */}
      <div
        className={`flex items-center gap-3 rounded-xl border border-line bg-white/95 px-4 py-3 backdrop-blur ${
          dirty ? 'sticky bottom-[72px] z-30 shadow-[0_4px_24px_rgba(0,0,0,0.08)] lg:bottom-4' : ''
        }`}
      >
        <button
          onClick={save}
          disabled={busy || !dirty}
          className="flex shrink-0 items-center gap-2 rounded bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-50"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Save changes
        </button>
        {message ? (
          <p role="status" className="flex items-center gap-2 text-[13.5px] text-ink">
            {message.ok ? <Check size={15} className="text-available" /> : <AlertCircle size={15} />}
            {message.text}
          </p>
        ) : (
          <p className="text-[13.5px] text-muted">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
        )}
      </div>
    </div>
  );
}

function DatePanel({
  date,
  state,
  usual,
  starts,
  hours,
  timezone,
  noticeHours,
  horizonDays,
  onToggle,
  onDayOff,
  onReset,
}: {
  date: string;
  state: 'off' | 'changed' | 'open' | 'closed';
  usual: number[];
  starts: number[];
  hours: number[];
  timezone: string;
  noticeHours: number;
  horizonDays: number;
  onToggle: (m: number) => void;
  onDayOff: () => void;
  onReset: () => void;
}) {
  const weekday = LONG_DAY[dowOf(date)];
  const status = {
    open: `Your usual ${weekday} hours.`,
    closed: `You are not usually free on ${weekday}s. Tap hours to open this date.`,
    changed: 'Changed for this date only.',
    off: 'Day off. No sessions can be booked.',
  }[state];

  // Hours too close to now for students to book, given the notice period.
  const now = Date.now();
  const earliest = zonedNow(new Date(now + noticeHours * 3_600_000), timezone);
  const lastBookable = zonedNow(new Date(now + horizonDays * 86_400_000), timezone).date;
  const tooSoon = (m: number) => date < earliest.date || (date === earliest.date && m < earliest.minute);
  const tooSoonCount = starts.filter(tooSoon).length;
  const hint =
    state === 'off'
      ? null
      : hours.every(tooSoon)
        ? `This date is too soon for new bookings: you ask for ${noticeOf(noticeHours)}.`
        : tooSoonCount > 0
          ? `Faded hours are too soon to book: you ask for ${noticeOf(noticeHours)}.`
          : date > lastBookable
            ? `Students can book up to ${horizonDays} days ahead, so this date opens for booking on ${label(
                addDays(date, -horizonDays),
                { weekday: 'long', day: 'numeric', month: 'long' },
              )}.`
            : null;

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-ink">
        {label(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </h3>
      <p className="mt-0.5 text-[13px] text-muted">{status}</p>

      {state !== 'off' && (
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Hours on this date">
          {hours.map((m) => {
            const on = starts.includes(m);
            const soon = tooSoon(m);
            return (
              <button
                key={m}
                aria-pressed={on}
                aria-label={soon ? `${fmt(m)}, too soon to book` : fmt(m)}
                title={soon ? 'Too soon to book' : undefined}
                onClick={() => onToggle(m)}
                className={`w-[62px] rounded py-1.5 text-[13px] tabular-nums transition-colors ${
                  on ? 'bg-navy font-medium text-white hover:bg-navy-deep' : 'bg-fill text-muted hover:bg-sky-muted hover:text-ink'
                } ${soon ? 'opacity-40' : ''}`}
              >
                {fmt(m)}
              </button>
            );
          })}
        </div>
      )}

      {hint && <p className="mt-3 text-[12.5px] text-muted">{hint}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        {state !== 'off' && usual.length + starts.length > 0 && (
          <button
            onClick={onDayOff}
            className="rounded border border-line px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
          >
            Take the day off
          </button>
        )}
        {(state === 'changed' || state === 'off') && (
          <button
            onClick={onReset}
            className="rounded border border-line px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
          >
            {state === 'off' ? 'Undo day off' : `Back to usual ${weekday} hours`}
          </button>
        )}
      </div>
    </div>
  );
}
