'use client';

import { addDays, dowOf, fmt, label, LONG_DAY, noticeOf, zonedNow, type DateState } from './shared';

/**
 * One chosen date: its hours as buttons, or that it is a day off, with a note
 * when some hours are too soon to book or the date is beyond the booking window.
 */
export default function DatePanel({
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
  state: DateState;
  usual: number[];
  starts: number[];
  hours: number[];
  timezone: string;
  noticeHours: number;
  horizonDays: number;
  onToggle: (minute: number) => void;
  onDayOff: () => void;
  onReset: () => void;
}) {
  const weekday = LONG_DAY[dowOf(date)];
  const status: Record<DateState, string> = {
    open: `Your usual ${weekday} hours.`,
    closed: `You are not usually free on ${weekday}s. Tap hours to open this date.`,
    changed: 'Changed for this date only.',
    off: 'Day off. No sessions can be booked.',
  };

  // Hours too close to now for students to book, given the notice period.
  const now = Date.now();
  const earliest = zonedNow(new Date(now + noticeHours * 3_600_000), timezone);
  const lastBookable = zonedNow(new Date(now + horizonDays * 86_400_000), timezone).date;
  const tooSoon = (m: number) => date < earliest.date || (date === earliest.date && m < earliest.minute);
  const hint =
    state === 'off'
      ? null
      : hours.every(tooSoon)
        ? `This date is too soon for new bookings: you ask for ${noticeOf(noticeHours)}.`
        : starts.some(tooSoon)
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
      <p className="mt-0.5 text-[13px] text-muted">{status[state]}</p>

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
