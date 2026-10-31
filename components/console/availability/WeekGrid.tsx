'use client';

import { useEffect, useRef } from 'react';
import { DAYS, fmt, plural, type Week } from './shared';

/**
 * The usual week: days across, hours down. Tap a cell to switch an hour on or
 * off; with a mouse, drag across cells to paint several. On touch screens a
 * drag scrolls the page, so only taps change cells there.
 */
export default function WeekGrid({
  week,
  hours,
  timezone,
  onSetHour,
  onWorkdays,
  onClear,
}: {
  week: Week;
  hours: number[];
  timezone: string;
  onSetHour: (dow: number, minute: number, on: boolean) => void;
  onWorkdays: () => void;
  onClear: () => void;
}) {
  // The value a mouse drag is painting, or null when no drag is under way.
  const paint = useRef<boolean | null>(null);
  // A mouse press already toggled the cell, so the click that follows must not.
  const skipClick = useRef(false);
  useEffect(() => {
    const stop = () => (paint.current = null);
    window.addEventListener('pointerup', stop);
    return () => window.removeEventListener('pointerup', stop);
  }, []);

  const freeHours = DAYS.reduce((n, { dow }) => n + week[dow].length, 0);

  return (
    <section className="rounded-xl border border-line">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">1. Your usual week</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Tap the hours you are free. Students can start a 45-minute session at any quarter hour inside them
            (13:00, 13:15, 13:30, 13:45), with a 15-minute break kept after each. Times are in {timezone}.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={onWorkdays}
            className="rounded border border-line px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
          >
            Weekdays 9 to 5
          </button>
          <button
            onClick={onClear}
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
                      onSetHour(d.dow, m, !on);
                    }}
                    onPointerEnter={(e) => {
                      if (e.pointerType === 'mouse' && paint.current !== null) onSetHour(d.dow, m, paint.current);
                    }}
                    onClick={() => {
                      if (skipClick.current) {
                        skipClick.current = false;
                        return;
                      }
                      onSetHour(d.dow, m, !on);
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
          {freeHours === 0
            ? 'No hours yet. Students cannot book you until you add some.'
            : `${plural(freeHours, 'free hour')} a week.`}
        </p>
      </div>
    </section>
  );
}
