import { isValidObjectId } from 'mongoose';
import dbConnect from '../connect';
import { Booking, MentorProfile, User, VideoSession } from '../models';
import type { BookingStatus } from '../models/Booking';
import {
  dailyClient,
  roomNameFor,
  sessionWindow,
  VideoUnavailableError,
  type DailyClient,
} from '@/lib/video/daily';
import { DataError } from './errors';

/**
 * The video call behind a booking. Only its student and its mentor can see
 * or join it; anyone else gets the same "not found" as for a missing booking.
 */

export interface SessionRoomInfo {
  bookingId: string;
  role: 'student' | 'mentor';
  /** The other person, as this person should see them: mentors see a student's first name only. */
  otherName: string;
  otherInitials: string;
  otherPhoto: string | null;
  topic: string;
  status: BookingStatus;
  startsAt: string;
  endsAt: string;
  opensAt: string;
  closesAt: string;
  /** Whether a call has taken place and been timed. */
  videoStatus: 'none' | 'provisioned' | 'in_progress' | 'ended';
}

async function loadForParticipant(bookingId: string, userId: string) {
  if (!isValidObjectId(bookingId) || !isValidObjectId(userId)) return null;
  await dbConnect();
  const booking = await Booking.findById(bookingId).lean();
  if (!booking) return null;
  const mentor = await MentorProfile.findById(booking.mentor).select('user displayName initials photo').lean();
  if (!mentor) return null;
  const role = String(booking.student) === userId ? 'student' : String(mentor.user) === userId ? 'mentor' : null;
  if (!role) return null;
  return { booking, mentor, role } as const;
}

export async function getSessionRoomInfo(bookingId: string, userId: string): Promise<SessionRoomInfo | null> {
  const found = await loadForParticipant(bookingId, userId);
  if (!found) return null;
  const { booking, mentor, role } = found;
  const student = await User.findById(booking.student).select('name').lean();
  const video = await VideoSession.findOne({ booking: booking._id }).select('status').lean();
  const window = sessionWindow(new Date(booking.startsAt), new Date(booking.endsAt));
  const studentFirst = (student?.name ?? 'Student').split(' ')[0];

  return {
    bookingId: String(booking._id),
    role,
    otherName: role === 'student' ? mentor.displayName : studentFirst,
    otherInitials: role === 'student' ? mentor.initials : studentFirst.slice(0, 2).toUpperCase(),
    otherPhoto: role === 'student' ? (mentor.photo ?? null) : null,
    topic: booking.topic,
    status: booking.status,
    startsAt: new Date(booking.startsAt).toISOString(),
    endsAt: new Date(booking.endsAt).toISOString(),
    opensAt: window.opensAt.toISOString(),
    closesAt: window.closesAt.toISOString(),
    videoStatus: video ? (video.status === 'expired' ? 'none' : video.status) : 'none',
  };
}

/**
 * Let one of the two participants into the call: check the booking is
 * confirmed and the room is open, make the room on first use, record when
 * each person joined, and issue that person's own meeting token.
 */
export async function joinVideoSession(
  bookingId: string,
  userId: string,
  options: { now?: Date; client?: DailyClient } = {},
): Promise<{ roomUrl: string; token: string }> {
  const now = options.now ?? new Date();
  const found = await loadForParticipant(bookingId, userId);
  if (!found) throw new DataError('BOOKING_NOT_FOUND', 'No such booking.');
  const { booking, mentor, role } = found;

  if (booking.status !== 'confirmed') {
    throw new DataError(
      'SESSION_NOT_OPEN',
      booking.status === 'pending' ? 'This session has not been confirmed yet.' : 'This session is not taking place.',
    );
  }
  const window = sessionWindow(new Date(booking.startsAt), new Date(booking.endsAt));
  if (now < window.opensAt) throw new DataError('SESSION_NOT_OPEN', 'The call opens 10 minutes before the session.');
  if (now > window.closesAt) throw new DataError('SESSION_NOT_OPEN', 'This session has finished.');

  let client: DailyClient;
  try {
    client = options.client ?? dailyClient();
  } catch (err) {
    throw new DataError('VIDEO_UNAVAILABLE', (err as Error).message);
  }

  try {
    const roomName = roomNameFor(String(booking._id));
    const room = await client.ensureRoom(roomName, window);
    await VideoSession.updateOne(
      { booking: booking._id },
      { $setOnInsert: { booking: booking._id, roomName, roomUrl: room.url, roomExpiresAt: window.closesAt, status: 'provisioned' } },
      { upsert: true },
    );

    // First join only, for each side.
    const field = role === 'student' ? 'studentJoinedAt' : 'mentorJoinedAt';
    await VideoSession.updateOne({ booking: booking._id, [field]: { $exists: false } }, { $set: { [field]: now } });

    const user = await User.findById(userId).select('name').lean();
    const displayName = role === 'mentor' ? mentor.displayName : (user?.name ?? 'Student').split(' ')[0];
    const token = await client.createToken(roomName, displayName, role === 'mentor', window);
    return { roomUrl: room.url, token };
  } catch (err) {
    if (err instanceof VideoUnavailableError) throw new DataError('VIDEO_UNAVAILABLE', err.message);
    throw err;
  }
}

/**
 * After someone leaves, take the call's timing from Daily's own records:
 * the first meeting both people were in sets when it started, and the last
 * one when it ended. Nothing about what was said or shown is stored, and
 * nothing is recorded.
 */
export async function syncVideoSession(
  bookingId: string,
  userId: string,
  options: { client?: DailyClient } = {},
): Promise<{ status: string; durationSeconds?: number }> {
  const found = await loadForParticipant(bookingId, userId);
  if (!found) throw new DataError('BOOKING_NOT_FOUND', 'No such booking.');
  const video = await VideoSession.findOne({ booking: found.booking._id });
  if (!video) return { status: 'none' };

  let client: DailyClient;
  try {
    client = options.client ?? dailyClient();
  } catch {
    return { status: video.status };
  }
  const meetings = (await client.meetings(video.roomName)).filter((m) => m.participants >= 2);
  if (meetings.length > 0) {
    const first = meetings.reduce((a, b) => (a.startTime < b.startTime ? a : b));
    const lastEnd = Math.max(...meetings.map((m) => m.startTime.getTime() + m.durationSeconds * 1000));
    video.startedAt = first.startTime;
    video.endedAt = new Date(lastEnd);
    video.status = 'ended';
    await video.save();
  } else if (video.studentJoinedAt && video.mentorJoinedAt && video.status === 'provisioned') {
    video.status = 'in_progress';
    await video.save();
  }
  return { status: video.status, durationSeconds: video.durationSeconds };
}
