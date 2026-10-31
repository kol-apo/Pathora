'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, DAYS, dowOf, isoOf, label, toUTC, type DateState } from './shared';

const STATE_CLASS: Record<DateState, string> = {
  open: 'bg-sky-soft text-navy font-medium',
  changed: 'bg-sky-soft text-navy font-medium',
  off: 'text-faint line-through',
  closed: 'text-muted',
};

const STATE_WORDS: Record<DateState, string> = {
  open: 'open',
  changed: 'changed hours',
  off: 'day off',
  closed: 'no hours',
};

/** A month of dates, Monday first. Open dates are tinted, changed ones dotted, days off struck through. */
export default function DateCalendar({
  month,
  onMonth,
  today,
  lastDay,
  selected,
  onSelect,
  stateOf,
}: {
  /** "YYYY-MM" */
  month: string;
  onMonth: (month: string) => void;
  today: string;
  lastDay: string;
  selected: string | null;
  onSelect: (date: string | null) => void;
  stateOf: (date: string) => DateState;
}) {
  const monthStart = `${month}-01`;
  const lead = (dowOf(monthStart) + 6) % 7; // blank cells before the 1st, Monday first
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i)),
  ];
  const shift = (n: number) => {
    const dt = toUTC(monthStart);
    dt.setUTCMonth(dt.getUTCMonth() + n);
    onMonth(isoOf(dt).slice(0, 7));
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          disabled={month <= today.slice(0, 7)}
          aria-label="Previous month"
          className="rounded p-1.5 text-ink transition-colors hover:bg-surface disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-[14px] font-semibold text-ink">{label(monthStart, { month: 'long', year: 'numeric' })}</span>
        <button
          onClick={() => shift(1)}
          disabled={month >= lastDay.slice(0, 7)}
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
              onClick={() => onSelect(isSelected ? null : date)}
              aria-pressed={isSelected}
              aria-label={`${label(date, { weekday: 'long', day: 'numeric', month: 'long' })}, ${STATE_WORDS[state]}`}
              className={`relative flex h-10 items-center justify-center rounded text-[13.5px] tabular-nums transition-colors disabled:cursor-default disabled:bg-transparent disabled:text-line ${
                isSelected ? 'bg-navy font-semibold text-white' : `${STATE_CLASS[state]} hover:ring-1 hover:ring-navy`
              }`}
            >
              {Number(date.slice(8))}
              {state === 'changed' && !outOfRange && (
                <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-navy'}`} />
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
  );
}
