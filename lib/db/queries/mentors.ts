// Mongoose 9 renamed FilterQuery to QueryFilter.
import { isValidObjectId, type QueryFilter } from 'mongoose';
import dbConnect from '../connect';
import { Availability, Booking, MentorProfile } from '../models';
import type { IMentorProfile } from '../models/MentorProfile';
import { generateSlots, type BusyInterval } from '@/lib/booking/slots';
import type { Sector } from '@/lib/types';
import { DataError } from './errors';
import { toMentorDTO, type MentorDTO, type SlotDTO } from './dto';

export type MentorSort = 'experience' | 'rating' | 'booked';

export interface ListMentorsOptions {
  sector?: Sector | 'All';
  query?: string;
  sort?: MentorSort;
  limit?: number;
  skip?: number;
  /** Unvetted mentors are hidden from students; the admin queue passes false. */
  vettedOnly?: boolean;
}

const SORTS: Record<MentorSort, Record<string, 1 | -1>> = {
  experience: { experience: -1 },
  rating: { ratingAvg: -1, ratingCount: -1 },
  booked: { sessionCount: -1 },
};

export async function listMentors(
  options: ListMentorsOptions = {},
): Promise<{ mentors: MentorDTO[]; total: number }> {
  await dbConnect();

  const { sector, query, sort = 'experience', limit = 24, skip = 0, vettedOnly = true } = options;

  const filter: QueryFilter<IMentorProfile> = {};
  if (vettedOnly) filter.vetted = true;
  if (sector && sector !== 'All') filter.sector = sector;

  const trimmed = query?.trim();
  if (trimmed) {
    // $text uses the weighted index; a regex fallback would scan the whole
    // collection and ignore the weighting.
    filter.$text = { $search: trimmed };
  }

  const [docs, total] = await Promise.all([
    MentorProfile.find(filter)
      .sort(SORTS[sort])
      .skip(Math.max(0, skip))
      .limit(Math.min(100, Math.max(1, limit)))
      .lean(),
    MentorProfile.countDocuments(filter),
  ]);

  return { mentors: await withNextSlots(docs.map(toMentorDTO)), total };
}

export async function getMentor(mentorId: string): Promise<MentorDTO | null> {
  if (!isValidObjectId(mentorId)) throw new DataError('INVALID_ID', 'Malformed mentor id.');
  await dbConnect();

  const doc = await MentorProfile.findById(mentorId).lean();
  if (!doc) return null;
  const [mentor] = await withNextSlots([toMentorDTO(doc)]);
  return mentor;
}

/**
 * Fill in `nextSlotAt` for a page of mentors.
 *
 * Runs the same slot generator the booking flow uses, so "Available this week"
 * on a card can never disagree with what the picker then offers. Two queries
 * for the whole page — availability and bookings fetched with `$in` — rather
 * than two per mentor.
 */
async function withNextSlots(mentors: MentorDTO[], now = new Date()): Promise<MentorDTO[]> {
  if (mentors.length === 0) return mentors;
  const ids = mentors.map((m) => m.id);

  const [allRules, bookings] = await Promise.all([
    Availability.find({ mentor: { $in: ids } }).lean(),
    Booking.find({
      mentor: { $in: ids },
      active: true,
      // A day of slack so a session that began yesterday and runs past now
      // still counts as busy.
      endsAt: { $gte: new Date(now.getTime() - 86_400_000) },
    })
      .select('mentor startsAt endsAt')
      .lean(),
  ]);

  const rulesByMentor = new Map(allRules.map((r) => [String(r.mentor), r]));
  const busyByMentor = new Map<string, BusyInterval[]>();
  for (const b of bookings) {
    const key = String(b.mentor);
    const list = busyByMentor.get(key) ?? [];
    list.push({ startsAt: new Date(b.startsAt), endsAt: new Date(b.endsAt) });
    busyByMentor.set(key, list);
  }

  return mentors.map((m) => {
    const rules = rulesByMentor.get(m.id);
    if (!m.acceptingBookings || !rules) return { ...m, nextSlotAt: null };

    const [first] = generateSlots({
      rules,
      timeZone: m.timezone,
      now,
      busy: busyByMentor.get(m.id) ?? [],
    });
    return { ...m, nextSlotAt: first ? first.startsAt.toISOString() : null };
  });
}

/** Mentors in a sector, topped up from others so callers always get `count`. */
export async function featuredMentors(sector: Sector, count = 3): Promise<MentorDTO[]> {
  await dbConnect();

  const inSector = await MentorProfile.find({ vetted: true, sector })
    .sort(SORTS.rating)
    .limit(count)
    .lean();

  if (inSector.length >= count) return inSector.map(toMentorDTO);

  const topUp = await MentorProfile.find({
    vetted: true,
    sector: { $ne: sector },
    _id: { $nin: inSector.map((m) => m._id) },
  })
    .sort(SORTS.rating)
    .limit(count - inSector.length)
    .lean();

  return [...inSector, ...topUp].map(toMentorDTO);
}

/**
 * Active bookings that could clash with anything in `[from, to]`.
 *
 * Widened by a day either side so a session starting just outside the window
 * but overlapping into it is still counted as busy.
 */
export async function busyIntervalsFor(
  mentorId: string,
  from: Date,
  to: Date,
): Promise<BusyInterval[]> {
  const docs = await Booking.find({
    mentor: mentorId,
    active: true,
    startsAt: {
      $gte: new Date(from.getTime() - 86_400_000),
      $lte: new Date(to.getTime() + 86_400_000),
    },
  })
    .select('startsAt endsAt')
    .lean();

  return docs.map((b) => ({ startsAt: new Date(b.startsAt), endsAt: new Date(b.endsAt) }));
}

export interface SlotQuery {
  from?: Date;
  to?: Date;
  now?: Date;
}

/** Bookable slots for a mentor, with existing bookings already removed. */
export async function listAvailableSlots(
  mentorId: string,
  q: SlotQuery = {},
): Promise<SlotDTO[]> {
  if (!isValidObjectId(mentorId)) throw new DataError('INVALID_ID', 'Malformed mentor id.');
  await dbConnect();

  const mentor = await MentorProfile.findById(mentorId).lean();
  if (!mentor) throw new DataError('MENTOR_NOT_FOUND', 'No such mentor.');
  if (mentor.acceptingBookings === false) return [];

  const rules = await Availability.findOne({ mentor: mentorId }).lean();
  if (!rules) return [];

  const now = q.now ?? new Date();
  const from = q.from ?? now;
  const to = q.to ?? new Date(now.getTime() + rules.horizonDays * 86_400_000);

  const busy = await busyIntervalsFor(mentorId, from, to);

  const slots = generateSlots({
    rules,
    timeZone: mentor.timezone,
    now,
    from,
    to,
    busy,
  });

  return slots.map((s) => ({
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
  }));
}
