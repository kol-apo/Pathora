import { isValidObjectId, Types, type QueryFilter } from 'mongoose';
import dbConnect from '../connect';
import { Booking, DiscoveryResult, MentorProfile, StudentProfile, VideoSession } from '../models';
import type { BookingStatus, IBooking } from '../models/Booking';
import type { Sector } from '@/lib/types';

/**
 * What the admin sees of sessions, feedback and participants.
 *
 * Students appear by participant code, never by name or email: the admin is
 * also the researcher, and the study's records are pseudonymised. A student
 * who has not consented has no code and is shown as "No code".
 */

// ── Sessions ────────────────────────────────────────────────────────────────

export const SESSION_VIEWS = ['upcoming', 'awaiting', 'held', 'missed', 'unconfirmed', 'cancelled', 'all'] as const;
export type SessionView = (typeof SESSION_VIEWS)[number];

export const SESSION_VIEW_LABELS: Record<SessionView, string> = {
  upcoming: 'Upcoming',
  awaiting: 'Needs outcome',
  held: 'Held',
  missed: 'Did not happen',
  unconfirmed: 'Never confirmed',
  cancelled: 'Cancelled',
  all: 'All',
};

function filterFor(view: SessionView, now: Date): QueryFilter<IBooking> {
  switch (view) {
    case 'upcoming':
      return { status: { $in: ['pending', 'confirmed'] }, endsAt: { $gte: now } };
    case 'awaiting':
      return { status: 'confirmed', endsAt: { $lt: now } };
    case 'held':
      return { status: 'completed' };
    case 'missed':
      return { status: 'no_show' };
    case 'unconfirmed':
      return { status: 'pending', endsAt: { $lt: now } };
    case 'cancelled':
      return { status: 'cancelled' };
    case 'all':
      return {};
  }
}

export interface AdminSessionRow {
  id: string;
  startsAt: string;
  mentor: { id: string; name: string; sector: Sector } | null;
  participantCode: string | null;
  topic: string;
  viaBridge: boolean;
  status: BookingStatus;
  /** Who cancelled, when cancelled. */
  cancelledBy: 'student' | 'mentor' | null;
  video: { studentJoined: boolean; mentorJoined: boolean; minutes: number | null } | null;
  rating: { score: number; comment: string | null } | null;
}

async function codesFor(studentIds: Types.ObjectId[]): Promise<Map<string, string>> {
  const profiles = await StudentProfile.find({ user: { $in: studentIds }, participantCode: { $exists: true } })
    .select('user participantCode')
    .lean();
  return new Map(profiles.map((p) => [String(p.user), p.participantCode as string]));
}

export async function listSessionsForAdmin(
  options: { view?: SessionView; mentorId?: string; limit?: number; now?: Date } = {},
): Promise<{ rows: AdminSessionRow[]; counts: Record<SessionView, number>; mentorName: string | null }> {
  const { view = 'upcoming', limit = 200, now = new Date() } = options;
  await dbConnect();

  const scope: QueryFilter<IBooking> =
    options.mentorId && isValidObjectId(options.mentorId) ? { mentor: new Types.ObjectId(options.mentorId) } : {};

  const counts = Object.fromEntries(
    await Promise.all(
      SESSION_VIEWS.map(async (v) => [v, await Booking.countDocuments({ ...scope, ...filterFor(v, now) })] as const),
    ),
  ) as Record<SessionView, number>;

  // Upcoming soonest first; everything else most recent first.
  const docs = await Booking.find({ ...scope, ...filterFor(view, now) })
    .sort({ startsAt: view === 'upcoming' ? 1 : -1 })
    .limit(Math.min(500, Math.max(1, limit)))
    .select('student mentor topic startsAt status viaBridge rating cancelledBy')
    .lean();

  const [mentors, codes, videos] = await Promise.all([
    MentorProfile.find({ _id: { $in: docs.map((d) => d.mentor) } })
      .select('displayName sector')
      .lean(),
    codesFor(docs.map((d) => d.student)),
    VideoSession.find({ booking: { $in: docs.map((d) => d._id) } })
      .select('booking studentJoinedAt mentorJoinedAt durationSeconds')
      .lean(),
  ]);
  const mentorById = new Map(mentors.map((m) => [String(m._id), m]));
  const videoByBooking = new Map(videos.map((v) => [String(v.booking), v]));

  const rows = docs.map((d): AdminSessionRow => {
    const m = mentorById.get(String(d.mentor));
    const v = videoByBooking.get(String(d._id));
    return {
      id: String(d._id),
      startsAt: new Date(d.startsAt).toISOString(),
      mentor: m ? { id: String(m._id), name: m.displayName, sector: m.sector } : null,
      participantCode: codes.get(String(d.student)) ?? null,
      topic: d.topic,
      viaBridge: !!d.viaBridge,
      status: d.status,
      cancelledBy: d.status !== 'cancelled' || !d.cancelledBy ? null : String(d.cancelledBy) === String(d.student) ? 'student' : 'mentor',
      video: v
        ? {
            studentJoined: !!v.studentJoinedAt,
            mentorJoined: !!v.mentorJoinedAt,
            minutes: v.durationSeconds != null ? Math.round(v.durationSeconds / 60) : null,
          }
        : null,
      rating: d.rating ? { score: d.rating.score, comment: d.rating.comment ?? null } : null,
    };
  });

  const mentorName = scope.mentor ? ((await MentorProfile.findById(scope.mentor).select('displayName').lean())?.displayName ?? null) : null;
  return { rows, counts, mentorName };
}

// ── Feedback ────────────────────────────────────────────────────────────────

export interface FeedbackComment {
  bookingId: string;
  ratedAt: string;
  score: number;
  comment: string | null;
  mentor: { id: string; name: string } | null;
  participantCode: string | null;
  viaBridge: boolean;
}

export interface MentorActivityRow {
  mentorId: string;
  name: string;
  sector: Sector;
  status: string;
  booked: number;
  held: number;
  missed: number;
  cancelled: number;
  upcoming: number;
  ratings: number;
  averageRating: number | null;
}

export interface FeedbackSummary {
  ratings: number;
  averageRating: number | null;
  /** How many ratings gave 1, 2, 3, 4 and 5 stars. */
  distribution: [number, number, number, number, number];
  withComment: number;
  comments: FeedbackComment[];
  byMentor: MentorActivityRow[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function feedbackSummary(options: { now?: Date; limit?: number } = {}): Promise<FeedbackSummary> {
  const { now = new Date(), limit = 200 } = options;
  await dbConnect();

  const rated: QueryFilter<IBooking> = { 'rating.score': { $exists: true }, status: { $in: ['confirmed', 'completed'] as BookingStatus[] } };
  const [ratedDocs, perMentor, mentors] = await Promise.all([
    Booking.find(rated)
      .sort({ 'rating.createdAt': -1 })
      .limit(limit)
      .select('student mentor rating viaBridge')
      .lean(),
    Booking.aggregate<{
      _id: Types.ObjectId;
      booked: number;
      held: number;
      missed: number;
      cancelled: number;
      upcoming: number;
      ratings: number;
      ratingSum: number;
    }>([
      {
        $group: {
          _id: '$mentor',
          booked: { $sum: 1 },
          held: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          missed: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          upcoming: {
            $sum: {
              $cond: [{ $and: [{ $in: ['$status', ['pending', 'confirmed']] }, { $gte: ['$endsAt', now] }] }, 1, 0],
            },
          },
          ratings: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$rating.score', null] }, { $in: ['$status', ['confirmed', 'completed']] }] },
                1,
                0,
              ],
            },
          },
          ratingSum: {
            $sum: {
              $cond: [{ $in: ['$status', ['confirmed', 'completed']] }, { $ifNull: ['$rating.score', 0] }, 0],
            },
          },
        },
      },
    ]),
    MentorProfile.find({}).select('displayName sector status').lean(),
  ]);

  // Totals over every rating, not just the comments shown.
  const [totals] = await Booking.aggregate<{ n: number; sum: number; withComment: number; d1: number; d2: number; d3: number; d4: number; d5: number }>([
    { $match: rated },
    {
      $group: {
        _id: null,
        n: { $sum: 1 },
        sum: { $sum: '$rating.score' },
        withComment: { $sum: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ['$rating.comment', ''] } }, 0] }, 1, 0] } },
        d1: { $sum: { $cond: [{ $eq: ['$rating.score', 1] }, 1, 0] } },
        d2: { $sum: { $cond: [{ $eq: ['$rating.score', 2] }, 1, 0] } },
        d3: { $sum: { $cond: [{ $eq: ['$rating.score', 3] }, 1, 0] } },
        d4: { $sum: { $cond: [{ $eq: ['$rating.score', 4] }, 1, 0] } },
        d5: { $sum: { $cond: [{ $eq: ['$rating.score', 5] }, 1, 0] } },
      },
    },
  ]);

  const mentorById = new Map(mentors.map((m) => [String(m._id), m]));
  const codes = await codesFor(ratedDocs.map((d) => d.student));

  const comments = ratedDocs.map((d): FeedbackComment => {
    const m = mentorById.get(String(d.mentor));
    return {
      bookingId: String(d._id),
      ratedAt: new Date(d.rating!.createdAt).toISOString(),
      score: d.rating!.score,
      comment: d.rating!.comment ?? null,
      mentor: m ? { id: String(m._id), name: m.displayName } : null,
      participantCode: codes.get(String(d.student)) ?? null,
      viaBridge: !!d.viaBridge,
    };
  });

  const byMentor = perMentor
    .map((r): MentorActivityRow | null => {
      const m = mentorById.get(String(r._id));
      if (!m) return null;
      return {
        mentorId: String(r._id),
        name: m.displayName,
        sector: m.sector,
        status: m.status ?? 'approved',
        booked: r.booked,
        held: r.held,
        missed: r.missed,
        cancelled: r.cancelled,
        upcoming: r.upcoming,
        ratings: r.ratings,
        averageRating: r.ratings ? round1(r.ratingSum / r.ratings) : null,
      };
    })
    .filter((r): r is MentorActivityRow => r !== null)
    .sort((a, b) => b.held - a.held || b.booked - a.booked || a.name.localeCompare(b.name));

  return {
    ratings: totals?.n ?? 0,
    averageRating: totals?.n ? round1(totals.sum / totals.n) : null,
    distribution: totals ? [totals.d1, totals.d2, totals.d3, totals.d4, totals.d5] : [0, 0, 0, 0, 0],
    withComment: totals?.withComment ?? 0,
    comments,
    byMentor,
  };
}

// ── Participants ────────────────────────────────────────────────────────────

export interface ParticipantRow {
  participantCode: string;
  consentedAt: string;
  discoveries: number;
  latestSector: Sector | null;
  booked: number;
  viaBridge: number;
  held: number;
  rated: number;
  lastSessionAt: string | null;
}

export async function listParticipants(): Promise<{
  rows: ParticipantRow[];
  /** Signed up as students but have not consented: no code, not in the study. */
  notConsented: number;
}> {
  await dbConnect();
  const [profiles, notConsented] = await Promise.all([
    StudentProfile.find({ participantCode: { $exists: true }, consentedAt: { $exists: true } })
      .select('user participantCode consentedAt')
      .sort({ consentedAt: -1 })
      .lean(),
    StudentProfile.countDocuments({ consentedAt: { $exists: false } }),
  ]);
  const users = profiles.map((p) => p.user);

  const [discoveries, bookings] = await Promise.all([
    DiscoveryResult.aggregate<{ _id: Types.ObjectId; n: number; latestSector: Sector }>([
      { $match: { student: { $in: users } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$student', n: { $sum: 1 }, latestSector: { $first: '$primary.sector' } } },
    ]),
    Booking.aggregate<{ _id: Types.ObjectId; booked: number; viaBridge: number; held: number; rated: number; last: Date }>([
      { $match: { student: { $in: users } } },
      {
        $group: {
          _id: '$student',
          booked: { $sum: 1 },
          viaBridge: { $sum: { $cond: ['$viaBridge', 1, 0] } },
          held: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          rated: { $sum: { $cond: [{ $gt: ['$rating.score', null] }, 1, 0] } },
          last: { $max: '$startsAt' },
        },
      },
    ]),
  ]);
  const dByUser = new Map(discoveries.map((d) => [String(d._id), d]));
  const bByUser = new Map(bookings.map((b) => [String(b._id), b]));

  return {
    notConsented,
    rows: profiles.map((p) => {
      const d = dByUser.get(String(p.user));
      const b = bByUser.get(String(p.user));
      return {
        participantCode: p.participantCode as string,
        consentedAt: new Date(p.consentedAt as Date).toISOString(),
        discoveries: d?.n ?? 0,
        latestSector: d?.latestSector ?? null,
        booked: b?.booked ?? 0,
        viaBridge: b?.viaBridge ?? 0,
        held: b?.held ?? 0,
        rated: b?.rated ?? 0,
        lastSessionAt: b?.last ? new Date(b.last).toISOString() : null,
      };
    }),
  };
}

// ── Overview ────────────────────────────────────────────────────────────────

/** A few headline numbers for the admin overview. */
export async function sessionHeadline(now = new Date()): Promise<{
  held: number;
  awaitingOutcome: number;
  ratings: number;
  averageRating: number | null;
}> {
  await dbConnect();
  const [held, awaitingOutcome, [r]] = await Promise.all([
    Booking.countDocuments(filterFor('held', now)),
    Booking.countDocuments(filterFor('awaiting', now)),
    Booking.aggregate<{ n: number; sum: number }>([
      { $match: { 'rating.score': { $exists: true }, status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, n: { $sum: 1 }, sum: { $sum: '$rating.score' } } },
    ]),
  ]);
  return { held, awaitingOutcome, ratings: r?.n ?? 0, averageRating: r?.n ? round1(r.sum / r.n) : null };
}
