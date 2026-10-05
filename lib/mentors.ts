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
    focus: m.focus,
    tags: m.tags,
    bio: m.bio,
    sessions: m.sessionCount,
    rating: m.ratingAvg,
    nextSlot: nextSlotLabel(m.nextSlotAt),
    helpWith: m.helpWith,
  };
}
