'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sameStarts, startsFromWindows, windowsFromStarts } from '@/lib/booking/hourGrid';
import BookingStatusCard, { bookingStatus } from './availability/BookingStatusCard';
import WeekGrid from './availability/WeekGrid';
import SpecificDates from './availability/SpecificDates';
import SaveBar from './availability/SaveBar';
import {
  addDays,
  DAYS,
  DEFAULT_HOURS,
  dowOf,
  MAX_DAYS_AHEAD,
  toggle,
  weekFromWindows,
  WORKDAY,
  type DateHours,
  type DateState,
  type MentorStatus,
  type Override,
  type Week,
  type WeeklyWindow,
} from './availability/shared';

/**
 * The mentor's availability page. This component holds the state and saves
 * it; the parts it shows live in ./availability/:
 *
 *   BookingStatusCard  what students see now, accepting bookings, minimum notice
 *   WeekGrid           the usual week, tap or drag to set free hours
 *   SpecificDates      a calendar for dates that differ (DateCalendar, DatePanel)
 *   SaveBar            one Save button, kept in view while there are changes
 */
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
  status: MentorStatus;
  /** The first time students can book now (saved state), already formatted. */
  nextSlotLabel: string | null;
}) {
  const router = useRouter();
  const [week, setWeek] = useState<Week>(() => weekFromWindows(initial));
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

  // ── Saving ─────────────────────────────────────────────────────────────────
  const payload = (w: Week, o: Record<string, Override>, a: boolean, n: number) => ({
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

  // ── The usual week ────────────────────────────────────────────────────────
  const changeWeek = (next: (w: Week) => Week) => {
    setMessage(null);
    setWeek(next);
  };

  // ── Specific dates ─────────────────────────────────────────────────────────
  const usualFor = (date: string) => week[dowOf(date)];
  const startsOn = (date: string) => overrides[date]?.starts ?? usualFor(date);
  const stateOf = (date: string): DateState => {
    const o = overrides[date];
    if (o?.blocked) return 'off';
    if (o) return 'changed';
    return usualFor(date).length ? 'open' : 'closed';
  };
  const setDate = (date: string, next: Override | null) => {
    setMessage(null);
    setOverrides((o) => {
      const copy = { ...o };
      if (next === null) delete copy[date];
      else copy[date] = next;
      return copy;
    });
  };
  /** Change one hour on a date. Matching the usual week again removes the change; no hours is a day off. */
  const toggleDateHour = (date: string, m: number) => {
    const now = startsOn(date);
    const next = toggle(now, m, !now.includes(m));
    if (sameStarts(next, usualFor(date))) setDate(date, null);
    else if (next.length === 0) setDate(date, { blocked: true, starts: [] });
    else setDate(date, { blocked: false, starts: next });
  };
  const changed = Object.entries(overrides)
    .filter(([date]) => date >= today)
    .sort(([a], [b]) => a.localeCompare(b));

  const shown = bookingStatus({
    status,
    accepting: initialAccepting,
    hasHours: initial.length > 0 || initialDates.some((d) => !d.blocked && d.windows.length > 0),
    nextSlotLabel,
    noticeHours: initialNoticeHours,
    horizonDays,
    timezone,
  });

  return (
    <div className="space-y-6">
      <BookingStatusCard
        title={shown.title}
        detail={shown.detail}
        bookable={shown.bookable}
        accepting={accepting}
        onAccepting={setAccepting}
        notice={notice}
        savedNotice={initialNoticeHours}
        onNotice={(h) => {
          setMessage(null);
          setNotice(h);
        }}
      />

      <WeekGrid
        week={week}
        hours={hours}
        timezone={timezone}
        onSetHour={(dow, m, on) => changeWeek((w) => ({ ...w, [dow]: toggle(w[dow], m, on) }))}
        onWorkdays={() => changeWeek((w) => ({ ...w, 1: WORKDAY, 2: WORKDAY, 3: WORKDAY, 4: WORKDAY, 5: WORKDAY }))}
        onClear={() => changeWeek(() => Object.fromEntries(DAYS.map(({ dow }) => [dow, []])))}
      />

      <SpecificDates
        month={month}
        onMonth={setMonth}
        today={today}
        lastDay={addDays(today, MAX_DAYS_AHEAD)}
        selected={selected}
        onSelect={setSelected}
        stateOf={stateOf}
        usualFor={usualFor}
        startsOn={startsOn}
        changed={changed}
        hours={hours}
        timezone={timezone}
        noticeHours={notice}
        horizonDays={horizonDays}
        onToggleHour={toggleDateHour}
        onDayOff={(date) => setDate(date, { blocked: true, starts: [] })}
        onReset={(date) => setDate(date, null)}
      />

      <SaveBar dirty={dirty} busy={busy} message={message} onSave={save} />
    </div>
  );
}
