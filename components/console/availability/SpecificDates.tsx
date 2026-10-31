'use client';

import DateCalendar from './DateCalendar';
import DatePanel from './DatePanel';
import { label, plural, type DateState, type Override } from './shared';

/**
 * Section 2: a calendar to pick a date, the chosen date's hours, and a list of
 * the dates already changed.
 */
export default function SpecificDates({
  month,
  onMonth,
  today,
  lastDay,
  selected,
  onSelect,
  stateOf,
  usualFor,
  startsOn,
  changed,
  hours,
  timezone,
  noticeHours,
  horizonDays,
  onToggleHour,
  onDayOff,
  onReset,
}: {
  month: string;
  onMonth: (month: string) => void;
  today: string;
  lastDay: string;
  selected: string | null;
  onSelect: (date: string | null) => void;
  stateOf: (date: string) => DateState;
  usualFor: (date: string) => number[];
  startsOn: (date: string) => number[];
  /** The changed dates from today on, soonest first. */
  changed: [string, Override][];
  hours: number[];
  timezone: string;
  noticeHours: number;
  horizonDays: number;
  onToggleHour: (date: string, minute: number) => void;
  onDayOff: (date: string) => void;
  onReset: (date: string) => void;
}) {
  return (
    <section className="rounded-xl border border-line">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">2. Specific dates (optional)</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          Tap a date to take it off or change its hours. Every other date follows your usual week.
        </p>
      </div>

      <div className="grid gap-6 px-5 py-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <DateCalendar
          month={month}
          onMonth={onMonth}
          today={today}
          lastDay={lastDay}
          selected={selected}
          onSelect={onSelect}
          stateOf={stateOf}
        />

        <div className="min-w-0">
          {selected ? (
            <DatePanel
              date={selected}
              state={stateOf(selected)}
              usual={usualFor(selected)}
              starts={startsOn(selected)}
              hours={hours}
              timezone={timezone}
              noticeHours={noticeHours}
              horizonDays={horizonDays}
              onToggle={(m) => onToggleHour(selected, m)}
              onDayOff={() => onDayOff(selected)}
              onReset={() => onReset(selected)}
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
                            onSelect(date);
                            onMonth(date.slice(0, 7));
                          }}
                          className="rounded-full border border-line bg-white px-3 py-1 text-[12.5px] text-ink transition-colors hover:border-navy"
                        >
                          {label(date, { weekday: 'short', day: 'numeric', month: 'short' })}
                          <span className="text-muted">
                            {' · '}
                            {o.blocked ? 'Day off' : plural(o.starts.length, 'free hour')}
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
  );
}
