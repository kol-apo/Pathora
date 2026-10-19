import type { MentorDTO } from '@/lib/db/queries/dto';
import type { Consultant } from '@/lib/types';

/**
 * Client-side adapter from the API's mentor shape to the `Consultant` shape the
 * UI components were designed around, so cards and the profile page render the
 * real data without any markup changes.
 *
 * Type-only import from `lib/db/` — erased at compile time, so no server code
 * reaches the browser bundle.
 */

const DAY_MS = 86_400_000;

/**
 * The card's availability line: `null` renders "Available this week", anything
 * else renders "Next slot <text>".
 */
export function nextSlotLabel(nextSlotAt: string | null | undefined, now = new Date()): string | null {
  if (!nextSlotAt) return 'not yet open';
  const days = Math.ceil((new Date(nextSlotAt).getTime() - now.getTime()) / DAY_MS);
  if (days <= 7) return null;
  if (days < 14) return `in ${days} days`;
  return `in ${Math.round(days / 7)} weeks`;
}

export function toConsultant(m: MentorDTO): Consultant {
  return {
    id: m.id,
    name: m.displayName,
    initials: m.initials,
    role: m.role,
    company: m.company,
    sector: m.sector,
    experience: m.experience,
    country: m.country,
    photo: m.photo,
    source: m.source,
    bookable: m.acceptingBookings,
    focus: m.focus,
    tags: m.tags,
    bio: m.bio,
    sessions: m.sessionCount,
    rating: m.ratingAvg,
    nextSlot: nextSlotLabel(m.nextSlotAt),
    helpWith: m.helpWith,
    socials: m.socials,
    links: m.links,
  };
}

/**
 * The line under a mentor's name: role and employer, or role and country when
 * the employer is not known (as for partner mentors listed from a directory).
 */
export function roleLine(m: { role: string; company: string; country?: string | null }): string {
  return [m.role, m.company || m.country].filter(Boolean).join(' · ');
}

/**
 * Mentors from partner organisations first, everyone else after, each group
 * keeping its existing order. Stable, so a sort chosen by the student still
 * applies within each group.
 */
export function partnersFirst<T extends { source?: string }>(list: T[]): T[] {
  const isPartner = (m: T) => !!m.source && m.source !== 'pathora';
  return [...list.filter(isPartner), ...list.filter((m) => !isPartner(m))];
}
