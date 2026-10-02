/**
 * Timezone helpers built on `Intl`, with no external dependency.
 *
 * The rule this codebase follows: availability is authored in the mentor's
 * *local wall time* (minutes from midnight), bookings are stored as *UTC
 * instants*. Everything in this file exists to move between those two safely,
 * including across daylight-saving transitions.
 */

const pad = (n: number) => String(n).padStart(2, '0');

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    // Throws RangeError on an invalid IANA zone, which is what we want —
    // a bad timezone should fail loudly at the boundary, not silently
    // produce slots in the wrong place.
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** The wall-clock reading in `timeZone` at a given UTC instant. */
export function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = getFormatter(timeZone).formatToParts(instant);
  const out: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {};
  for (const p of parts) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    year: out.year!,
    month: out.month!,
    day: out.day!,
    hour: out.hour!,
    minute: out.minute!,
    second: out.second!,
  };
}

/**
 * Offset of `timeZone` from UTC at a given instant, in milliseconds.
 * Positive east of Greenwich. Accounts for DST because it is evaluated
 * *at that instant*, not as a fixed property of the zone.
 */
export function getZoneOffsetMs(instant: Date, timeZone: string): number {
  const p = getZonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Drop sub-second precision so the comparison is like-for-like.
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Convert a wall-clock time in `timeZone` to the UTC instant it refers to.
 *
 * `dateISO` is a calendar day ("YYYY-MM-DD") in that zone and `minuteOfDay`
 * is minutes from local midnight.
 *
 * Two passes: the first guess treats the wall time as if it were UTC and reads
 * the offset there, the second re-reads the offset at the corrected instant.
 * That second pass is what makes DST boundaries land correctly — near a
 * transition the offset at the guess differs from the offset at the answer.
 */
export function zonedWallTimeToUtc(
  dateISO: string,
  minuteOfDay: number,
  timeZone: string,
): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d) + minuteOfDay * 60_000;

  let ts = wallAsUtc;
  for (let i = 0; i < 2; i++) {
    ts = wallAsUtc - getZoneOffsetMs(new Date(ts), timeZone);
  }
  return new Date(ts);
}

/** The calendar day ("YYYY-MM-DD") that a UTC instant falls on in `timeZone`. */
export function formatZonedDate(instant: Date, timeZone: string): string {
  const p = getZonedParts(instant, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Day of week for a calendar date. 0 = Sunday … 6 = Saturday. */
export function isoDateDayOfWeek(dateISO: string): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Calendar arithmetic on a "YYYY-MM-DD" string, independent of any zone. */
export function addDays(dateISO: string, n: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** True if `timeZone` is a valid IANA identifier. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    getFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}
