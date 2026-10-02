import { isValidObjectId } from 'mongoose';
import dbConnect from '../connect';
import { Availability, Booking, MentorProfile } from '../models';
import { ACTIVE_BOOKING_STATUSES, type BookingStatus } from '../models/Booking';
import { findSlot } from '@/lib/booking/slots';
import { DataError, isDuplicateKeyError } from './errors';
import { busyIntervalsFor } from './mentors';
import { toBookingDTO, type BookingDTO } from './dto';

export interface CreateBookingInput {
  /** Supplied by the caller. Comes from the session once auth exists. */
  studentId: string;
  mentorId: string;
  /** Must match a generated slot start exactly. */
  startsAt: Date;
  topic: string;
  now?: Date;
}

/**
 * Book a session.
 *
 * Two layers of protection, and both are needed:
 *
 *  1. `findSlot` proves the requested time is genuinely within the mentor's
 *     availability and not already taken. This catches a client posting an
 *     arbitrary timestamp — the honest-mistake case.
 *
 *  2. The partial unique index on `{ mentor, startsAt }` catches the race the
 *     first layer cannot: two requests that both pass validation microseconds
 *     apart, before either has written. MongoDB rejects the second with error
 *     11000, which becomes SLOT_TAKEN rather than a 500.
 *
 * Layer 1 alone is a time-of-check-to-time-of-use bug. Layer 2 alone would let
 * someone book 3am. Neither is redundant.
 */
export async function createBooking(input: CreateBookingInput): Promise<BookingDTO> {
  const { studentId, mentorId, startsAt, topic } = input;

  if (!isValidObjectId(studentId) || !isValidObjectId(mentorId)) {
    throw new DataError('INVALID_ID', 'Malformed student or mentor id.');
  }
  if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime())) {
    throw new DataError('INVALID_ID', 'startsAt must be a valid date.');
  }

  await dbConnect();
  const now = input.now ?? new Date();

  const mentor = await MentorProfile.findById(mentorId).lean();
  if (!mentor) throw new DataError('MENTOR_NOT_FOUND', 'No such mentor.');
  if (mentor.acceptingBookings === false) {
    throw new DataError('MENTOR_NOT_ACCEPTING', 'This mentor is not taking new sessions.');
  }

  const rules = await Availability.findOne({ mentor: mentorId }).lean();
  if (!rules) {
    throw new DataError('NO_AVAILABILITY', 'This mentor has not published any availability.');
  }

  const busy = await busyIntervalsFor(mentorId, startsAt, startsAt);

  const slot = findSlot({ rules, timeZone: mentor.timezone, now, busy }, startsAt);
  if (!slot) {
    throw new DataError(
      'SLOT_UNAVAILABLE',
      'That time is not available. It may have just been taken, or it falls outside the mentor’s hours.',
    );
  }

  try {
    const created = await Booking.create({
      student: studentId,
      mentor: mentorId,
      topic: topic.trim(),
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      status: 'pending',
    });
    return toBookingDTO(created.toObject());
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      // Someone won the race between our findSlot check and this write.
      throw new DataError('SLOT_TAKEN', 'Someone just booked that slot. Please pick another.');
    }
    throw err;
  }
}

export async function listBookingsForStudent(
  studentId: string,
  options: { upcomingOnly?: boolean; now?: Date; limit?: number } = {},
): Promise<BookingDTO[]> {
  if (!isValidObjectId(studentId)) throw new DataError('INVALID_ID', 'Malformed student id.');
  await dbConnect();

  const { upcomingOnly = false, now = new Date(), limit = 50 } = options;

  const filter: Record<string, unknown> = { student: studentId };
  if (upcomingOnly) {
    filter.status = { $in: ['pending', 'confirmed'] };
    filter.endsAt = { $gte: now };
  }

  const docs = await Booking.find(filter)
    .sort(upcomingOnly ? { startsAt: 1 } : { startsAt: -1 })
    .limit(limit)
    .populate('mentor')
    .lean();

  return docs.map(toBookingDTO);
}

export async function listBookingsForMentor(
  mentorId: string,
  options: { upcomingOnly?: boolean; now?: Date; limit?: number } = {},
): Promise<BookingDTO[]> {
  if (!isValidObjectId(mentorId)) throw new DataError('INVALID_ID', 'Malformed mentor id.');
  await dbConnect();

  const { upcomingOnly = false, now = new Date(), limit = 50 } = options;

  const filter: Record<string, unknown> = { mentor: mentorId };
  if (upcomingOnly) {
    filter.status = { $in: ['pending', 'confirmed'] };
    filter.endsAt = { $gte: now };
  }

  const docs = await Booking.find(filter).sort({ startsAt: 1 }).limit(limit).lean();
  return docs.map(toBookingDTO);
}

/**
 * Fetch a booking only if `userId` is one of its participants.
 *
 * The authorisation check for the session room. Returns null rather than
 * throwing a distinguishable error, so a stranger cannot probe for which
 * booking ids exist.
 */
export async function getBookingForParticipant(
  bookingId: string,
  userId: string,
): Promise<BookingDTO | null> {
  if (!isValidObjectId(bookingId) || !isValidObjectId(userId)) return null;
  await dbConnect();

  const doc = await Booking.findById(bookingId).populate('mentor').lean();
  if (!doc) return null;

  const isStudent = String(doc.student) === String(userId);
  // `mentor` is populated, so compare against the profile's owning user.
  const mentorUser = (doc.mentor as unknown as { user?: unknown })?.user;
  const isMentor = mentorUser ? String(mentorUser) === String(userId) : false;

  return isStudent || isMentor ? toBookingDTO(doc) : null;
}

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  cancelled: [],
  completed: [],
  no_show: [],
};

/**
 * Move a booking to a new status.
 *
 * Transitions are whitelisted so a completed session cannot be silently
 * cancelled, or a cancelled one resurrected — the latter would also collide
 * with the slot index if the time had since been rebooked.
 */
export async function setBookingStatus(
  bookingId: string,
  next: BookingStatus,
  actorId: string,
  reason?: string,
): Promise<BookingDTO> {
  if (!isValidObjectId(bookingId)) throw new DataError('INVALID_ID', 'Malformed booking id.');
  await dbConnect();

  const doc = await Booking.findById(bookingId);
  if (!doc) throw new DataError('BOOKING_NOT_FOUND', 'No such booking.');

  if (!ALLOWED_TRANSITIONS[doc.status].includes(next)) {
    throw new DataError(
      'INVALID_TRANSITION',
      `A ${doc.status} booking cannot become ${next}.`,
    );
  }

  doc.status = next;
  if (next === 'cancelled') {
    doc.cancelledBy = actorId as never;
    if (reason) doc.cancelReason = reason;
  }

  try {
    // The pre-validate hook re-derives `active`, which is what frees the slot
    // on cancellation and re-claims it on any future transition.
    await doc.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new DataError('SLOT_TAKEN', 'That slot has since been taken by another booking.');
    }
    throw err;
  }

  return toBookingDTO(doc.toObject());
}

export async function addBookingNote(
  bookingId: string,
  authorId: string,
  body: string,
): Promise<BookingDTO> {
  if (!isValidObjectId(bookingId) || !isValidObjectId(authorId)) {
    throw new DataError('INVALID_ID', 'Malformed id.');
  }
  await dbConnect();

  const doc = await Booking.findByIdAndUpdate(
    bookingId,
    { $push: { notes: { body: body.trim(), author: authorId, createdAt: new Date() } } },
    { new: true, runValidators: true },
  ).lean();

  if (!doc) throw new DataError('BOOKING_NOT_FOUND', 'No such booking.');
  return toBookingDTO(doc);
}

/** True when a booking still occupies its slot. Mirrors the index predicate. */
export function occupiesSlot(status: BookingStatus): boolean {
  return ACTIVE_BOOKING_STATUSES.includes(status);
}
