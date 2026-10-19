const DAY_MS = 86_400_000;
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "Closes 30 Oct · 11 days left", or a nudge to check the publisher when no date is stated. */
export function deadlineLabel(deadline: string | null, now = new Date()): { text: string; urgent: boolean } {
  if (!deadline) return { text: 'Deadline on their site', urgent: false };
  const date = new Date(deadline);
  const days = Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
  const left = days <= 0 ? 'closes today' : days === 1 ? '1 day left' : `${days} days left`;
  return { text: `Closes ${dateFormat.format(date)} · ${left}`, urgent: days <= 14 };
}
