import { isValidObjectId } from 'mongoose';
import dbConnect from '../connect';
import { Availability, Booking, MentorProfile, User } from '../models';
import type { MentorStatus } from '../models/MentorProfile';
import type { BookingStatus } from '../models/Booking';
import { addDays, formatZonedDate, isValidTimeZone } from '@/lib/booking/timezone';
import { SECTORS, type Sector } from '@/lib/types';
import { initialsFor } from './accounts';
import { setBookingStatus } from './bookings';
import { listAvailableSlots } from './mentors';
import { refreshMentorRating } from './feedback';
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

export interface TimeWindow {
  startMinute: number;
  endMinute: number;
}

/**
 * One calendar date that differs from the weekly hours: either a day off
 * (`blocked`) or its own hours, which replace that weekday's hours.
 */
export interface DateHours {
  /** "YYYY-MM-DD" in the mentor's timezone. */
  date: string;
  blocked: boolean;
  windows: TimeWindow[];
}

/** How far ahead a mentor can set hours for a single date. */
export const DATE_HOURS_MAX_DAYS_AHEAD = 365;

/**
 * How much notice a mentor can ask for before a session, in hours. A request
 * still has to be confirmed by the mentor, so very short notice suits mentors
 * who check often (and testing).
 */
export const NOTICE_HOURS = [10 / 60, 0.5, 1, 3, 12, 24, 48] as const;

export interface MyAvailability {
  weekly: WeeklyWindow[];
  dates: DateHours[];
  acceptingBookings: boolean;
  timezone: string;
  noticeHours: number;
  /** Students can book this many days ahead. */
  horizonDays: number;
  status: MentorStatus;
  /** The first time a student can book right now, or null if none. */
  nextSlotAt: string | null;
}

export async function getMyAvailability(userId: string): Promise<MyAvailability | null> {
  await dbConnect();
  const m = await MentorProfile.findOne({ user: userId }).lean();
  if (!m) return null;
  const rules = await Availability.findOne({ mentor: m._id }).lean();
  const today = formatZonedDate(new Date(), m.timezone);
  return {
    weekly: (rules?.weekly ?? []).map((w) => ({
      dayOfWeek: w.dayOfWeek,
      startMinute: w.startMinute,
      endMinute: w.endMinute,
    })),
    // Dates already gone are of no use to the mentor, so only today onwards.
    dates: (rules?.exceptions ?? [])
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: e.date,
        blocked: e.blocked,
        windows: e.blocked ? [] : e.windows.map((w) => ({ startMinute: w.startMinute, endMinute: w.endMinute })),
      })),
    acceptingBookings: m.acceptingBookings !== false,
    timezone: m.timezone,
    noticeHours: rules?.leadTimeHours ?? 24,
    horizonDays: rules?.horizonDays ?? 30,
    status: m.status ?? (m.vetted ? 'approved' : 'pending_review'),
    // The same calculation students' booking cards use.
    nextSlotAt: rules ? ((await listAvailableSlots(String(m._id)))[0]?.startsAt ?? null) : null,
  };
}

const BAD_WINDOW = 'Each window must be at least 45 minutes, within one day.';

function isValidWindow(w: TimeWindow): boolean {
  return (
    Number.isInteger(w.startMinute) &&
    Number.isInteger(w.endMinute) &&
    w.startMinute >= 0 &&
    w.endMinute <= 1440 &&
    w.endMinute - w.startMinute >= 45
  );
}

function hasOverlap(windows: TimeWindow[]): boolean {
  const sorted = [...windows].sort((a, b) => a.startMinute - b.startMinute);
  return sorted.some((w, i) => i > 0 && w.startMinute < sorted[i - 1].endMinute);
}

/** A real calendar date written as YYYY-MM-DD (rejects 2026-02-30). */
function isCalendarDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return addDays(s, 0) === s;
}

/**
 * Replace the mentor's weekly hours and their date-specific hours. Windows may
 * not overlap on the same day. Dates already past are dropped, not rejected:
 * a page left open overnight should still save.
 */
export async function updateMyAvailability(
  userId: string,
  input: { weekly: WeeklyWindow[]; dates?: DateHours[]; acceptingBookings: boolean; noticeHours?: number },
): Promise<void> {
  await dbConnect();
  const m = await MentorProfile.findOne({ user: userId });
  if (!m) throw new DataError('NOT_A_MENTOR', 'No mentor profile for this account.');

  const byDay = new Map<number, WeeklyWindow[]>();
  for (const w of input.weekly) {
    const valid = Number.isInteger(w.dayOfWeek) && w.dayOfWeek >= 0 && w.dayOfWeek <= 6 && isValidWindow(w);
    if (!valid) throw new DataError('INVALID_AVAILABILITY', BAD_WINDOW);
    byDay.set(w.dayOfWeek, [...(byDay.get(w.dayOfWeek) ?? []), w]);
  }
  for (const windows of byDay.values()) {
    if (hasOverlap(windows)) throw new DataError('INVALID_AVAILABILITY', 'Two windows on the same day overlap.');
  }

  const today = formatZonedDate(new Date(), m.timezone);
  const lastDay = addDays(today, DATE_HOURS_MAX_DAYS_AHEAD);
  const seen = new Set<string>();
  const exceptions: DateHours[] = [];
  for (const d of input.dates ?? []) {
    if (!isCalendarDate(d.date)) throw new DataError('INVALID_AVAILABILITY', 'Choose a valid date.');
    if (seen.has(d.date)) throw new DataError('INVALID_AVAILABILITY', `${d.date} is listed twice.`);
    seen.add(d.date);
    if (d.date < today) continue;
    if (d.date > lastDay) {
      throw new DataError('INVALID_AVAILABILITY', 'Dates can be set up to a year ahead.');
    }
    if (d.blocked) {
      exceptions.push({ date: d.date, blocked: true, windows: [] });
      continue;
    }
    if (d.windows.length === 0) {
      throw new DataError('INVALID_AVAILABILITY', `Add hours for ${d.date}, or mark it as a day off.`);
    }
    if (!d.windows.every(isValidWindow)) throw new DataError('INVALID_AVAILABILITY', BAD_WINDOW);
    if (hasOverlap(d.windows)) {
      throw new DataError('INVALID_AVAILABILITY', `Two windows on ${d.date} overlap.`);
    }
    exceptions.push({
      date: d.date,
      blocked: false,
      windows: d.windows.map((w) => ({ startMinute: w.startMinute, endMinute: w.endMinute })),
    });
  }
  exceptions.sort((a, b) => a.date.localeCompare(b.date));

  // Without `dates`, an older client is saving weekly hours only: keep its dates.
  const $set: Record<string, unknown> = { weekly: input.weekly };
  if (input.dates) $set.exceptions = exceptions;
  if (input.noticeHours !== undefined) {
    const current = await Availability.findOne({ mentor: m._id }).select('leadTimeHours').lean();
    const allowed = (NOTICE_HOURS as readonly number[]).includes(input.noticeHours);
    // An existing value outside the list (set by a script) may be kept as it is.
    if (!allowed && input.noticeHours !== current?.leadTimeHours) {
      throw new DataError('INVALID_AVAILABILITY', 'Choose a notice period from the list.');
    }
    $set.leadTimeHours = input.noticeHours;
  }
  await Availability.findOneAndUpdate(
    { mentor: m._id },
    { $set },
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
  return docs.map(toMentorBooking);
}

/** Students appear by first name only. */
function toMentorBooking(b: {
  _id: unknown;
  student: unknown;
  topic: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  viaBridge?: boolean;
}): MentorBookingDTO {
  return {
    id: String(b._id),
    studentName: ((b.student as { name?: string } | null)?.name ?? 'A student').split(' ')[0],
    topic: b.topic,
    startsAt: new Date(b.startsAt).toISOString(),
    endsAt: new Date(b.endsAt).toISOString(),
    status: b.status,
    viaBridge: !!b.viaBridge,
  };
}

export type MentorBookingAction = 'confirm' | 'decline' | 'complete' | 'no_show';

const NEXT_STATUS: Record<MentorBookingAction, BookingStatus> = {
  confirm: 'confirmed',
  decline: 'cancelled',
  complete: 'completed',
  no_show: 'no_show',
};

/**
 * A mentor acts on one of their own bookings: confirm or decline a request,
 * or, once a confirmed session's start time has passed, record whether it
 * took place. Returns what the research log needs (no ids leave the server).
 */
export async function respondToBooking(
  userId: string,
  bookingId: string,
  action: MentorBookingAction,
  now = new Date(),
): Promise<{ studentId: string; sector: Sector; viaBridge: boolean }> {
  if (!isValidObjectId(bookingId)) throw new DataError('INVALID_ID', 'Malformed booking id.');
  await dbConnect();
  const m = await MentorProfile.findOne({ user: userId }).select('_id sector').lean();
  // "Not found" for someone else's booking too, so ids cannot be probed.
  const booking = m
    ? await Booking.findOne({ _id: bookingId, mentor: m._id }).select('student status startsAt viaBridge').lean()
    : null;
  if (!booking) throw new DataError('BOOKING_NOT_FOUND', 'No such booking.');

  if (action === 'complete' || action === 'no_show') {
    if (booking.status !== 'confirmed') {
      throw new DataError('INVALID_TRANSITION', 'Only a confirmed session can be marked as held or missed.');
    }
    if (new Date(booking.startsAt) > now) {
      throw new DataError('SESSION_NOT_STARTED', 'You can record this once the session has started.');
    }
  }

  await setBookingStatus(bookingId, NEXT_STATUS[action], userId);
  if (action === 'complete') {
    await MentorProfile.updateOne({ _id: m!._id }, { $inc: { sessionCount: 1 } });
  }
  // A rating left before the mentor said it did not happen no longer counts.
  if (action === 'no_show') await refreshMentorRating(String(m!._id));
  return { studentId: String(booking.student), sector: m!.sector, viaBridge: !!booking.viaBridge };
}

/**
 * The mentor's past sessions: confirmed ones that have started and still need
 * an outcome, and the most recent ones already settled.
 */
export async function listMyPastSessions(
  userId: string,
  now = new Date(),
): Promise<{ awaiting: MentorBookingDTO[]; recent: MentorBookingDTO[] }> {
  await dbConnect();
  const m = await MentorProfile.findOne({ user: userId }).select('_id').lean();
  if (!m) return { awaiting: [], recent: [] };
  const [awaiting, recent] = await Promise.all([
    Booking.find({ mentor: m._id, status: 'confirmed', startsAt: { $lte: now } })
      .sort({ startsAt: 1 })
      .populate('student', 'name')
      .lean(),
    Booking.find({ mentor: m._id, status: { $in: ['completed', 'no_show'] } })
      .sort({ startsAt: -1 })
      .limit(10)
      .populate('student', 'name')
      .lean(),
  ]);
  return { awaiting: awaiting.map(toMentorBooking), recent: recent.map(toMentorBooking) };
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
