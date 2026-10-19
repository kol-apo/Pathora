import bcrypt from 'bcryptjs';
import dbConnect from '../connect';
import {
  AnalyticsEvent,
  Availability,
  Booking,
  BridgeRecommendation,
  DiscoveryResult,
  MentorProfile,
  PasswordReset,
  StudentProfile,
  User,
  VideoSession,
} from '../models';
import { DataError } from './errors';

/**
 * Withdrawing from the study and deleting the account: everything Pathora
 * holds about the person goes, including their research events, which are
 * found through their participant code. Nothing is kept "anonymised": the
 * consent form promises withdrawal, so the data is removed.
 *
 * Admin accounts cannot delete themselves; another admin removes them.
 */

export interface DeletionReport {
  discoveryResults: number;
  bookings: number;
  researchEvents: number;
}

export async function deleteAccount(userId: string, password: string | null): Promise<DeletionReport> {
  await dbConnect();
  const user = await User.findById(userId).select('+passwordHash role').lean();
  if (!user) throw new DataError('INVALID_ID', 'No such account.');
  if (user.role === 'admin') {
    throw new DataError('CANNOT_DELETE_ADMIN', 'Admin accounts are removed by another admin.');
  }
  // Accounts with a password confirm it, so a borrowed, signed-in laptop is not enough.
  if (user.passwordHash && !(password && (await bcrypt.compare(password, user.passwordHash)))) {
    throw new DataError('WRONG_PASSWORD', 'That password is not right.');
  }

  const report: DeletionReport = { discoveryResults: 0, bookings: 0, researchEvents: 0 };

  // As a student: results and their bridge records, bookings, research events, profile.
  const results = await DiscoveryResult.find({ student: userId }).select('_id').lean();
  const resultIds = results.map((r) => r._id);
  await BridgeRecommendation.deleteMany({ discoveryResult: { $in: resultIds } });
  report.discoveryResults = (await DiscoveryResult.deleteMany({ _id: { $in: resultIds } })).deletedCount;

  const studentBookings = await Booking.find({ student: userId }).select('_id').lean();
  await VideoSession.deleteMany({ booking: { $in: studentBookings.map((b) => b._id) } });
  report.bookings += (await Booking.deleteMany({ student: userId })).deletedCount;

  const profile = await StudentProfile.findOne({ user: userId }).select('participantCode').lean();
  if (profile?.participantCode) {
    report.researchEvents = (await AnalyticsEvent.deleteMany({ participantCode: profile.participantCode })).deletedCount;
  }
  await StudentProfile.deleteMany({ user: userId });

  // As a mentor: their sessions, their places in students' matches, their hours, profile.
  const mentor = await MentorProfile.findOne({ user: userId }).select('_id').lean();
  if (mentor) {
    const mentorBookings = await Booking.find({ mentor: mentor._id }).select('_id').lean();
    await VideoSession.deleteMany({ booking: { $in: mentorBookings.map((b) => b._id) } });
    report.bookings += (await Booking.deleteMany({ mentor: mentor._id })).deletedCount;
    await BridgeRecommendation.deleteMany({ mentor: mentor._id });
    await Availability.deleteMany({ mentor: mentor._id });
    await MentorProfile.deleteOne({ _id: mentor._id });
  }

  await PasswordReset.deleteMany({ user: userId });
  await User.deleteOne({ _id: userId });
  return report;
}

/** What the account page shows before someone decides. */
export async function accountSummary(userId: string): Promise<{
  hasPassword: boolean;
  participantCode: string | null;
  discoveryResults: number;
  bookings: number;
}> {
  await dbConnect();
  const [user, profile, discoveryResults, bookings] = await Promise.all([
    User.findById(userId).select('+passwordHash').lean(),
    StudentProfile.findOne({ user: userId }).select('participantCode').lean(),
    DiscoveryResult.countDocuments({ student: userId }),
    Booking.countDocuments({ student: userId }),
  ]);
  return {
    hasPassword: !!user?.passwordHash,
    participantCode: profile?.participantCode ?? null,
    discoveryResults,
    bookings,
  };
}
