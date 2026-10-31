import { startsFromWindows, type TimeWindow } from '@/lib/booking/hourGrid';

/**
 * Types, constants and small date helpers shared by the parts of the mentor
 * availability editor. Dates are "YYYY-MM-DD" strings in the mentor's
 * timezone; times are minutes from midnight.
 */

export interface WeeklyWindow extends TimeWindow {
  dayOfWeek: number;
}

/** One calendar date with its own hours, or a day off, as the server sends it. */
export interface DateHours {
  date: string;
  blocked: boolean;
  windows: TimeWindow[];
}

/** A date that differs from the usual week, as the editor holds it. */
export interface Override {
  blocked: boolean;
  starts: number[];
}

/** Free hours for each weekday (0 = Sunday), as the hours' start minutes. */
export type Week = Record<number, number[]>;

/** How a calendar date stands against the usual week. */
export type DateState = 'off' | 'changed' | 'open' | 'closed';

export type MentorStatus = 'pending_review' | 'approved' | 'rejected' | 'suspended';

// Monday first, the way most people think about a working week.
export const DAYS = [
  { dow: 1, short: 'Mon', long: 'Monday' },
  { dow: 2, short: 'Tue', long: 'Tuesday' },
  { dow: 3, short: 'Wed', long: 'Wednesday' },
  { dow: 4, short: 'Thu', long: 'Thursday' },
  { dow: 5, short: 'Fri', long: 'Friday' },
  { dow: 6, short: 'Sat', long: 'Saturday' },
  { dow: 0, short: 'Sun', long: 'Sunday' },
];
export const LONG_DAY: Record<number, string> = Object.fromEntries(DAYS.map((d) => [d.dow, d.long]));

/** The hours shown by default: every hour from 06:00 to 21:00. */
export const DEFAULT_HOURS = Array.from({ length: 16 }, (_, i) => 360 + i * 60);
export const WORKDAY = [540, 600, 660, 720, 780, 840, 900, 960]; // 09:00-17:00
export const MAX_DAYS_AHEAD = 365;

/** Must match NOTICE_HOURS in lib/db/queries/mentorConsole.ts. */
export const NOTICE_OPTIONS = [
  { hours: 10 / 60, label: '10 minutes' },
  { hours: 0.5, label: '30 minutes' },
  { hours: 1, label: '1 hour' },
  { hours: 3, label: '3 hours' },
  { hours: 12, label: '12 hours' },
  { hours: 24, label: '1 day' },
  { hours: 48, label: '2 days' },
];

export const noticeLabel = (h: number) =>
  NOTICE_OPTIONS.find((o) => o.hours === h)?.label ?? (h % 24 === 0 ? `${h / 24} days` : `${h} hours`);

/** "1 day's notice", "2 days' notice". */
export const noticeOf = (h: number) => {
  const l = noticeLabel(h);
  return `${l}${l.endsWith('s') ? "'" : "'s"} notice`;
};

/** "09:00" from 540. */
export const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const toUTC = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const isoOf = (dt: Date) => dt.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => {
  const dt = toUTC(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return isoOf(dt);
};
export const dowOf = (iso: string) => toUTC(iso).getUTCDay();

/** Formatted in UTC so a date never shifts by a day. */
export const label = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  toUTC(iso).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });

/** The local date and minute of the day of an instant in a timezone. */
export function zonedNow(instant: Date, timeZone: string): { date: string; minute: number } {
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

export function weekFromWindows(windows: WeeklyWindow[]): Week {
  const week: Week = {};
  for (const { dow } of DAYS) {
    week[dow] = startsFromWindows(windows.filter((w) => w.dayOfWeek === dow));
  }
  return week;
}

/** Add or remove one hour, keeping the list sorted and without repeats. */
export const toggle = (list: number[], m: number, on: boolean) =>
  on ? [...new Set([...list, m])].sort((a, b) => a - b) : list.filter((x) => x !== m);

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
