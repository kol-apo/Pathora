import { isValidObjectId } from 'mongoose';
import dbConnect from '../connect';
import { Availability, Booking, MentorProfile, User } from '../models';
import type { MentorStatus } from '../models/MentorProfile';
import type { BookingStatus } from '../models/Booking';
import { isValidTimeZone } from '@/lib/booking/timezone';
import { SECTORS, type Sector } from '@/lib/types';
import { initialsFor } from './accounts';
import { setBookingStatus } from './bookings';
import { DataError } from './errors';
import type { MentorLink, MentorSocials } from '@/lib/profileLinks';

/**
 * Mentor console: applying, availability, and responding to booking requests.
 * Every function takes the signed-in user's id and acts only on their own data.
 */

export interface MentorApplication {
  role: string;
  company: string;
  sector: Sector;
  country: string;
  timezone: string;
  experience: number;
  bio: string;
  focus: string[];
  tags: string[];
  helpWith: string[];
  codeOfConductOk: boolean;
  /** Already checked and tidied by cleanProfileLinks(). */
  socials?: MentorSocials;
  links?: MentorLink[];
}

/**
 * Submit a mentor application. Creates a pending profile (hidden from students
 * until an admin approves it) and moves the account to the mentor role.
 */
export async function applyAsMentor(userId: string, input: MentorApplication): Promise<{ id: string }> {
  await dbConnect();
  const user = await User.findById(userId).lean();
  if (!user) throw new DataError('MENTOR_NOT_FOUND', 'Account not found.');
  if (user.role === 'admin') throw new DataError('NOT_A_MENTOR', 'Admin accounts cannot apply as mentors.');
  if (await MentorProfile.exists({ user: userId })) {
    throw new DataError('ALREADY_APPLIED', 'You have already applied.');
  }
  if (!input.codeOfConductOk) {
    throw new DataError('INVALID_APPLICATION', 'Please agree to the code of conduct.');
  }
  if (!SECTORS.includes(input.sector)) throw new DataError('INVALID_APPLICATION', 'Choose a sector.');
  if (!isValidTimeZone(input.timezone)) throw new DataError('INVALID_APPLICATION', 'Choose a valid timezone.');

  const profile = await MentorProfile.create({
    user: userId,
    displayName: user.name,
    initials: initialsFor(user.name),
    role: input.role.trim(),
    company: input.company.trim(),
    sector: input.sector,
    country: input.country.trim(),
    timezone: input.timezone,
    experience: input.experience,
    bio: input.bio.trim(),
    focus: input.focus.slice(0, 3),
    tags: input.tags,
    helpWith: input.helpWith,
    socials: input.socials ?? {},
    links: input.links ?? [],
    codeOfConductOk: true,
    status: 'pending_review',
  });
  // Weekly hours start empty; the mentor sets them once approved.
  await Availability.create({ mentor: profile._id, weekly: [], sessionMinutes: 45, bufferMinutes: 15 });
  await User.updateOne({ _id: userId }, { $set: { role: 'mentor' } });
  return { id: String(profile._id) };
}

export interface MentorSelf {
  id: string;
  displayName: string;
  role: string;
  company: string;
  sector: Sector;
  status: MentorStatus;
  acceptingBookings: boolean;
  timezone: string;
}

export async function getMentorSelf(userId: string): Promise<MentorSelf | null> {
  await dbConnect();
  const m = await MentorProfile.findOne({ user: userId }).lean();
  if (!m) return null;
  return {
    id: String(m._id),
    displayName: m.displayName,
    role: m.role,
    company: m.company,
    sector: m.sector,
    status: m.status ?? (m.vetted ? 'approved' : 'pending_review'),
    acceptingBookings: m.acceptingBookings !== false,
    timezone: m.timezone,
  };
}

export interface WeeklyWindow {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export async function getMyAvailability(
  userId: string,
): Promise<{ weekly: WeeklyWindow[]; acceptingBookings: boolean; timezone: string } | null> {
  await dbConnect();
  const m = await MentorProfile.findOne({ user: userId }).lean();
  if (!m) return null;
  const rules = await Availability.findOne({ mentor: m._id }).lean();
  return {
    weekly: (rules?.weekly ?? []).map((w) => ({
      dayOfWeek: w.dayOfWeek,
      startMinute: w.startMinute,
      endMinute: w.endMinute,
    })),
    acceptingBookings: m.acceptingBookings !== false,
    timezone: m.timezone,
  };
}

/** Replace the mentor's weekly hours. Windows may not overlap on the same day. */
export async function updateMyAvailability(
  userId: string,
  input: { weekly: WeeklyWindow[]; acceptingBookings: boolean },
): Promise<void> {
  await dbConnect();
  const m = await MentorProfile.findOne({ user: userId });
  if (!m) throw new DataError('NOT_A_MENTOR', 'No mentor profile for this account.');

  const byDay = new Map<number, WeeklyWindow[]>();
  for (const w of input.weekly) {
    const valid =
      Number.isInteger(w.dayOfWeek) &&
      w.dayOfWeek >= 0 &&
      w.dayOfWeek <= 6 &&
      Number.isInteger(w.startMinute) &&
      Number.isInteger(w.endMinute) &&
      w.startMinute >= 0 &&
      w.endMinute <= 1440 &&
      w.endMinute - w.startMinute >= 45;
    if (!valid) {
      throw new DataError('INVALID_AVAILABILITY', 'Each window must be at least 45 minutes, within one day.');
    }
    byDay.set(w.dayOfWeek, [...(byDay.get(w.dayOfWeek) ?? []), w]);
  }
  for (const windows of byDay.values()) {
    const sorted = [...windows].sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startMinute < sorted[i - 1].endMinute) {
        throw new DataError('INVALID_AVAILABILITY', 'Two windows on the same day overlap.');
      }
    }
  }

  await Availability.findOneAndUpdate(
    { mentor: m._id },
    { $set: { weekly: input.weekly } },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  m.acceptingBookings = input.acceptingBookings;
  await m.save();
}

export interface MentorBookingDTO {
  id: string;
  studentName: string;
  topic: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  viaBridge: boolean;
}

/** The mentor's upcoming sessions. Students are shown by first name only. */
export async function listMyBookings(userId: string, now = new Date()): Promise<MentorBookingDTO[]> {
  await dbConnect();
  const m = await MentorProfile.findOne({ user: userId }).select('_id').lean();
  if (!m) return [];
  const docs = await Booking.find({
    mentor: m._id,
    status: { $in: ['pending', 'confirmed'] },
    endsAt: { $gte: now },
  })
    .sort({ startsAt: 1 })
    .populate('student', 'name')
    .lean();
  return docs.map((b) => ({
    id: String(b._id),
    studentName: ((b.student as unknown as { name?: string })?.name ?? 'A student').split(' ')[0],
    topic: b.topic,
    startsAt: new Date(b.startsAt).toISOString(),
    endsAt: new Date(b.endsAt).toISOString(),
    status: b.status,
    viaBridge: !!b.viaBridge,
  }));
}

/** Confirm or decline one of the mentor's own booking requests. */
export async function respondToBooking(
  userId: string,
  bookingId: string,
  action: 'confirm' | 'decline',
): Promise<void> {
  if (!isValidObjectId(bookingId)) throw new DataError('INVALID_ID', 'Malformed booking id.');
  await dbConnect();
  const m = await MentorProfile.findOne({ user: userId }).select('_id').lean();
  // "Not found" for someone else's booking too, so ids cannot be probed.
  const booking = m ? await Booking.findOne({ _id: bookingId, mentor: m._id }).select('_id').lean() : null;
  if (!booking) throw new DataError('BOOKING_NOT_FOUND', 'No such booking.');
  await setBookingStatus(bookingId, action === 'confirm' ? 'confirmed' : 'cancelled', userId);
}

/** The mentor's own public links, for the profile page in their console. */
export async function getMyLinks(userId: string): Promise<{ socials: MentorSocials; links: MentorLink[] } | null> {
  await dbConnect();
  const m = await MentorProfile.findOne({ user: userId }).select('socials links').lean();
  if (!m) return null;
  return {
    socials: { linkedin: m.socials?.linkedin || undefined, x: m.socials?.x || undefined },
    links: (m.links ?? []).map((l) => ({ kind: l.kind, url: l.url, title: l.title || undefined })),
  };
}

/** Replace the mentor's public links. Input must already be checked by cleanProfileLinks(). */
export async function updateMyLinks(
  userId: string,
  value: { socials: MentorSocials; links: MentorLink[] },
): Promise<void> {
  await dbConnect();
  const m = await MentorProfile.findOne({ user: userId });
  if (!m) throw new DataError('NOT_A_MENTOR', 'No mentor profile for this account.');
  m.socials = value.socials;
  m.links = value.links;
  await m.save();
}
