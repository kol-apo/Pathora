import { isValidObjectId } from 'mongoose';
import dbConnect from '../connect';
import { Booking, MentorProfile, User } from '../models';
import { appUrl } from '@/lib/appUrl';
import { isPlaceholderEmail } from '@/lib/partners';
import {
  cancelledByStudentEmail,
  confirmedEmail,
  declinedEmail,
  newRequestEmail,
  reminderEmails,
  type BookingFacts,
} from '@/lib/email/bookingEmails';
import { sendEmail, type Email, type SendResult } from '@/lib/email/send';

/**
 * Booking emails: who to tell, and when.
 *
 * Email is a courtesy on top of the app, never part of a booking: these
 * functions never throw, so a mail outage cannot undo a booking, a
 * confirmation or a cancellation. Partner mentors' placeholder addresses
 * (which cannot receive mail) are skipped.
 */

export type BookingEvent = 'requested' | 'confirmed' | 'declined' | 'cancelled_by_student';

type Send = (email: Email) => Promise<SendResult>;

async function factsFor(bookingId: string): Promise<BookingFacts | null> {
  if (!isValidObjectId(bookingId)) return null;
  await dbConnect();
  const booking = await Booking.findById(bookingId).select('student mentor topic startsAt studentTimeZone').lean();
  if (!booking) return null;
  const [student, mentor] = await Promise.all([
    User.findById(booking.student).select('name email').lean(),
    MentorProfile.findById(booking.mentor).select('user displayName timezone').lean(),
  ]);
  const mentorUser = mentor ? await User.findById(mentor.user).select('email').lean() : null;
  const base = appUrl();
  if (!student || !mentor || !mentorUser || !base) return null;
  return {
    bookingId: String(booking._id),
    startsAt: new Date(booking.startsAt),
    topic: booking.topic,
    student: { name: student.name, email: student.email, timeZone: booking.studentTimeZone },
    mentor: { name: mentor.displayName, email: mentorUser.email, timeZone: mentor.timezone },
    appUrl: base,
  };
}

async function deliver(emails: Email[], send: Send): Promise<SendResult[]> {
  const results: SendResult[] = [];
  for (const email of emails) {
    if (!email.to || isPlaceholderEmail(email.to)) {
      results.push({ sent: false, reason: 'no real address' });
      continue;
    }
    results.push(await send(email).catch((err) => ({ sent: false, reason: String(err) })));
  }
  return results;
}

/** Tell the right person about a change to a booking. Never throws. */
export async function notifyBooking(
  bookingId: string,
  event: BookingEvent,
  options: { send?: Send } = {},
): Promise<SendResult[]> {
  try {
    const facts = await factsFor(bookingId);
    if (!facts) return [];
    const email = {
      requested: newRequestEmail,
      confirmed: confirmedEmail,
      declined: declinedEmail,
      cancelled_by_student: cancelledByStudentEmail,
    }[event](facts);
    return await deliver([email], options.send ?? sendEmail);
  } catch (err) {
    console.error(`[email] could not send the "${event}" email:`, err);
    return [];
  }
}

/**
 * Remind both people about every confirmed session in the next 24 hours that
 * has not had its reminder. Run once a day by the scheduler. A reminder is
 * marked as sent only once at least one of the two emails went out, so a mail
 * outage means a retry on the next run rather than a silent miss.
 */
export async function sendReminders(
  options: { now?: Date; send?: Send } = {},
): Promise<{ sessions: number; emailsSent: number }> {
  const now = options.now ?? new Date();
  await dbConnect();
  const due = await Booking.find({
    status: 'confirmed',
    startsAt: { $gt: now, $lte: new Date(now.getTime() + 24 * 3_600_000) },
    reminderSentAt: { $exists: false },
  })
    .select('_id')
    .lean();

  let emailsSent = 0;
  let sessions = 0;
  for (const b of due) {
    const facts = await factsFor(String(b._id)).catch(() => null);
    if (!facts) continue;
    const results = await deliver(reminderEmails(facts), options.send ?? sendEmail);
    const sent = results.filter((r) => r.sent).length;
    if (sent > 0) {
      emailsSent += sent;
      sessions++;
      await Booking.updateOne({ _id: b._id }, { $set: { reminderSentAt: now } });
    }
  }
  return { sessions, emailsSent };
}
