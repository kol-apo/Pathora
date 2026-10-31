import { isValidObjectId, Types } from 'mongoose';
import dbConnect from '../connect';
import { Booking, MentorProfile } from '../models';
import { DataError } from './errors';
import { toBookingDTO, type BookingDTO } from './dto';

/**
 * Student feedback on a session: 1 to 5 stars and an optional comment.
 *
 * The stars feed the mentor's public average. The comment is seen only by the
 * Pathora team (the admin Feedback page), never by the mentor or other students.
 */

export const FEEDBACK_MAX_CHARS = 1000;

/** Sessions that took place, or may have (the mentor has not said yet). */
const RATEABLE = ['confirmed', 'completed'] as const;

export async function rateSession(
  bookingId: string,
  studentId: string,
  input: { score: number; comment?: string },
  now = new Date(),
): Promise<BookingDTO> {
  if (!isValidObjectId(bookingId) || !isValidObjectId(studentId)) {
    throw new DataError('INVALID_ID', 'Malformed id.');
  }
  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
    throw new DataError('NOT_RATEABLE', 'Choose between 1 and 5 stars.');
  }
  const comment = input.comment?.trim().slice(0, FEEDBACK_MAX_CHARS) || undefined;
  await dbConnect();

  // "Not found" for someone else's booking too, so ids cannot be probed.
  const doc = await Booking.findOne({ _id: bookingId, student: studentId }).select('mentor status endsAt rating').lean();
  if (!doc) throw new DataError('BOOKING_NOT_FOUND', 'No such booking.');
  if (new Date(doc.endsAt) > now) throw new DataError('SESSION_NOT_OVER', 'You can rate a session once it has ended.');
  if (!(RATEABLE as readonly string[]).includes(doc.status)) {
    throw new DataError('NOT_RATEABLE', 'Only sessions that took place can be rated.');
  }
  if (doc.rating) throw new DataError('ALREADY_RATED', 'You have already rated this session.');

  // Guarded by `rating: { $exists: false }`, so two quick submits rate once.
  const updated = await Booking.findOneAndUpdate(
    { _id: bookingId, student: studentId, rating: { $exists: false } },
    { $set: { rating: { score: input.score, comment, createdAt: now } } },
    { returnDocument: 'after', runValidators: true },
  ).lean();
  if (!updated) throw new DataError('ALREADY_RATED', 'You have already rated this session.');

  await refreshMentorRating(String(doc.mentor));
  return toBookingDTO(updated);
}

/**
 * Recompute a mentor's average from their bookings, rather than adjusting it
 * step by step, so it stays right when a session is later marked as missed or
 * a student deletes their account.
 */
export async function refreshMentorRating(mentorId: string): Promise<void> {
  if (!isValidObjectId(mentorId)) return;
  await dbConnect();
  const [agg] = await Booking.aggregate<{ avg: number; n: number }>([
    {
      $match: {
        mentor: new Types.ObjectId(mentorId),
        status: { $in: [...RATEABLE] },
        'rating.score': { $exists: true },
      },
    },
    { $group: { _id: null, avg: { $avg: '$rating.score' }, n: { $sum: 1 } } },
  ]);
  await MentorProfile.updateOne(
    { _id: mentorId },
    { $set: { ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0, ratingCount: agg?.n ?? 0 } },
  );
}
