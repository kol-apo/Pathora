/**
 * The availability editor shows hours as tappable start times: each one is a
 * session students can book. These helpers convert between those start times
 * and the windows that are stored (see `lib/booking/slots.ts`).
 *
 * A window produces a session at its start, then one every `step` minutes
 * (45-minute session + 15-minute break = 60), while the session still fits.
 */

export interface TimeWindow {
  startMinute: number;
  endMinute: number;
}

export const SESSION_MINUTES = 45;
export const SESSION_STEP = 60;

/** The session start times a set of windows offers, sorted, without repeats. */
export function startsFromWindows(
  windows: TimeWindow[],
  sessionMinutes = SESSION_MINUTES,
  step = SESSION_STEP,
): number[] {
  const starts = new Set<number>();
  for (const w of windows) {
    for (let m = w.startMinute; m + sessionMinutes <= w.endMinute; m += step) starts.add(m);
  }
  return [...starts].sort((a, b) => a - b);
}

/**
 * The fewest windows that offer exactly these start times. Runs one `step`
 * apart become one window. A start that would overlap the one before it (only
 * possible with odd legacy data, such as 09:00 and 09:30) is dropped.
 */
export function windowsFromStarts(starts: number[], step = SESSION_STEP): TimeWindow[] {
  const sorted = [...new Set(starts)].filter((m) => m >= 0 && m + step <= 1440).sort((a, b) => a - b);
  const windows: TimeWindow[] = [];
  for (const m of sorted) {
    const last = windows[windows.length - 1];
    if (last && m < last.endMinute) continue;
    if (last && m === last.endMinute) last.endMinute = m + step;
    else windows.push({ startMinute: m, endMinute: m + step });
  }
  return windows;
}

export const sameStarts = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort((x, y) => x - y).every((m, i) => m === [...b].sort((x, y) => x - y)[i]);
