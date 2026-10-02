import { addDays, formatZonedDate, isoDateDayOfWeek, zonedWallTimeToUtc } from './timezone';

/**
 * Slot generation.
 *
 * Pure functions — no database, no Mongoose, no clock of their own (`now` is
 * always injectable). Everything here is deterministic and directly testable.
 *
 * The Mongoose Availability document satisfies `AvailabilityRules`
 * structurally, so it can be passed straight in.
 */

export interface Window {
  startMinute: number;
  endMinute: number;
}

export interface WeeklyRule extends Window {
  dayOfWeek: number;
}

export interface DateException {
  date: string;
  blocked: boolean;
  windows: Window[];
}

export interface AvailabilityRules {
  weekly: WeeklyRule[];
  exceptions: DateException[];
  sessionMinutes: number;
  bufferMinutes: number;
  leadTimeHours: number;
  horizonDays: number;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
}

/** An existing commitment that blocks out time. Typically an active booking. */
export interface BusyInterval {
  startsAt: Date;
  endsAt: Date;
}

export interface GenerateSlotsInput {
  rules: AvailabilityRules;
  /** IANA zone the weekly rules are authored in. */
  timeZone: string;
  /** Injectable clock. Defaults to the real one. */
  now?: Date;
  /** Optional narrowing; intersected with the lead-time/horizon bounds. */
  from?: Date;
  to?: Date;
  busy?: BusyInterval[];
}

/** Which windows apply on a given calendar day — exceptions override weekly rules. */
export function windowsForDate(rules: AvailabilityRules, dateISO: string): Window[] {
  const exception = rules.exceptions.find((e) => e.date === dateISO);
  if (exception) {
    // A blocked day has no windows at all; otherwise the exception's own
    // windows replace that day's recurring rules entirely.
    return exception.blocked ? [] : exception.windows.map(toWindow);
  }
  const dow = isoDateDayOfWeek(dateISO);
  return rules.weekly.filter((w) => w.dayOfWeek === dow).map(toWindow);
}

const toWindow = (w: Window): Window => ({
  startMinute: w.startMinute,
  endMinute: w.endMinute,
});

/**
 * Does `[start, end)` clash with anything busy, once the required gap is
 * applied on both sides?
 */
export function conflictsWithBusy(
  start: Date,
  end: Date,
  busy: BusyInterval[],
  bufferMs: number,
): boolean {
  const s = start.getTime();
  const e = end.getTime();
  return busy.some((b) => {
    const bs = b.startsAt.getTime();
    const be = b.endsAt.getTime();
    return s < be + bufferMs && bs < e + bufferMs;
  });
}

/**
 * Every bookable slot in range, soonest first.
 *
 * Bounds are the intersection of the caller's `from`/`to` with the mentor's own
 * lead time (nothing too soon) and horizon (nothing too far out).
 */
export function generateSlots(input: GenerateSlotsInput): Slot[] {
  const { rules, timeZone, busy = [] } = input;
  const now = input.now ?? new Date();

  const step = rules.sessionMinutes + rules.bufferMinutes;
  if (step <= 0 || rules.sessionMinutes <= 0) return [];

  const earliest = new Date(now.getTime() + rules.leadTimeHours * 3_600_000);
  const latest = new Date(now.getTime() + rules.horizonDays * 86_400_000);

  const rangeStart = input.from && input.from > earliest ? input.from : earliest;
  const rangeEnd = input.to && input.to < latest ? input.to : latest;
  // Strictly-greater, not >=: a zero-width range is a legitimate query for one
  // exact instant, which is how findSlot() checks a single requested time.
  if (rangeStart > rangeEnd) return [];

  const bufferMs = rules.bufferMinutes * 60_000;
  const sessionMs = rules.sessionMinutes * 60_000;

  // Walk calendar days in the mentor's zone. One day of padding each side,
  // because a local day can straddle the UTC bounds of the range.
  let cursor = addDays(formatZonedDate(rangeStart, timeZone), -1);
  const lastDate = addDays(formatZonedDate(rangeEnd, timeZone), 1);

  const found = new Map<number, Slot>();

  // ISO date strings sort lexicographically, so a string compare is a date compare.
  while (cursor <= lastDate) {
    for (const w of windowsForDate(rules, cursor)) {
      for (let m = w.startMinute; m + rules.sessionMinutes <= w.endMinute; m += step) {
        const startsAt = zonedWallTimeToUtc(cursor, m, timeZone);
        const t = startsAt.getTime();

        if (t < rangeStart.getTime() || t > rangeEnd.getTime()) continue;

        const endsAt = new Date(t + sessionMs);
        if (conflictsWithBusy(startsAt, endsAt, busy, bufferMs)) continue;

        // Keyed by instant, so a DST fold cannot yield the same slot twice.
        if (!found.has(t)) found.set(t, { startsAt, endsAt });
      }
    }
    cursor = addDays(cursor, 1);
  }

  return [...found.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/**
 * Confirm a specific requested time is genuinely bookable.
 *
 * Use this server-side before writing a booking — a client can post any
 * timestamp it likes, and the unique index protects against double-booking but
 * not against booking at 3am outside the mentor's hours.
 */
export function findSlot(input: GenerateSlotsInput, startsAt: Date): Slot | null {
  const target = startsAt.getTime();
  // A zero-width range: only a slot starting on this exact instant can match.
  const slots = generateSlots({
    ...input,
    from: new Date(target),
    to: new Date(target),
  });
  return slots.find((s) => s.startsAt.getTime() === target) ?? null;
}

/** Group slots by their calendar day in the mentor's zone — for the picker UI. */
export function groupSlotsByDay(
  slots: Slot[],
  timeZone: string,
): { date: string; slots: Slot[] }[] {
  const byDay = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = formatZonedDate(s.startsAt, timeZone);
    const list = byDay.get(key);
    if (list) list.push(s);
    else byDay.set(key, [s]);
  }
  return [...byDay.entries()]
    .map(([date, daySlots]) => ({ date, slots: daySlots }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
