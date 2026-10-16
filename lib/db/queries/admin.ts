import { isValidObjectId } from 'mongoose';
import dbConnect from '../connect';
import { Booking, DiscoveryResult, MentorProfile, User } from '../models';
import type { MentorStatus } from '../models/MentorProfile';
import { isValidVector, VECTOR_DIMENSION } from '@/lib/matching/similarity';
import type { Sector } from '@/lib/types';
import { DataError } from './errors';

/**
 * Admin console: mentor review and platform counts.
 *
 * Callers must already have checked that the actor is an admin (the API
 * routes do, from the session). Every approval records which admin made it.
 */

export interface MentorReviewDTO {
  id: string;
  displayName: string;
  email: string;
  initials: string;
  role: string;
  company: string;
  sector: Sector;
  country?: string;
  experience: number;
  bio: string;
  focus: string[];
  tags: string[];
  helpWith: string[];
  socials: { linkedin?: string; x?: string };
  links: { kind: 'portfolio' | 'publication' | 'video' | 'website'; url: string; title?: string }[];
  status: MentorStatus;
  codeOfConductOk: boolean;
  profileVector: number[] | null;
  appliedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toReviewDTO(doc: any): MentorReviewDTO {
  return {
    id: String(doc._id),
    displayName: doc.displayName,
    email: doc.user?.email ?? '',
    initials: doc.initials,
    role: doc.role,
    company: doc.company,
    sector: doc.sector,
    country: doc.country,
    experience: doc.experience,
    bio: doc.bio,
    focus: doc.focus ?? [],
    tags: doc.tags ?? [],
    helpWith: doc.helpWith ?? [],
    socials: { linkedin: doc.socials?.linkedin || undefined, x: doc.socials?.x || undefined },
    links: (doc.links ?? []).map((l: any) => ({ kind: l.kind, url: l.url, title: l.title || undefined })),
    status: doc.status ?? (doc.vetted ? 'approved' : 'pending_review'),
    codeOfConductOk: !!doc.codeOfConductOk,
    profileVector: Array.isArray(doc.profileVector) && doc.profileVector.length ? doc.profileVector : null,
    appliedAt: new Date(doc.createdAt).toISOString(),
    approvedAt: doc.approvedAt ? new Date(doc.approvedAt).toISOString() : null,
    approvedBy: doc.approvedBy?.name ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listMentorsForReview(status: MentorStatus): Promise<MentorReviewDTO[]> {
  await dbConnect();
  const docs = await MentorProfile.find({ status })
    .sort(status === 'pending_review' ? { createdAt: 1 } : { updatedAt: -1 })
    .populate('user', 'email')
    .populate('approvedBy', 'name')
    .lean();
  return docs.map(toReviewDTO);
}

export async function countMentorsByStatus(): Promise<Record<MentorStatus, number>> {
  await dbConnect();
  const rows = await MentorProfile.aggregate<{ _id: MentorStatus; n: number }>([
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  const counts: Record<MentorStatus, number> = { pending_review: 0, approved: 0, rejected: 0, suspended: 0 };
  for (const r of rows) if (r._id in counts) counts[r._id] = r.n;
  return counts;
}

export type ReviewAction = 'approve' | 'reject' | 'suspend' | 'reinstate';

/** Which statuses each action may be taken from. */
const FROM: Record<ReviewAction, MentorStatus[]> = {
  approve: ['pending_review', 'rejected'],
  reject: ['pending_review'],
  suspend: ['approved'],
  reinstate: ['suspended'],
};

/**
 * Approve, reject, suspend or reinstate a mentor.
 *
 * Approving requires a valid interest vector (given now, or already set):
 * without one the bridge could never match this mentor to a student.
 */
export async function reviewMentor(input: {
  mentorId: string;
  adminUserId: string;
  action: ReviewAction;
  profileVector?: number[];
}): Promise<MentorReviewDTO> {
  const { mentorId, adminUserId, action, profileVector } = input;
  if (!isValidObjectId(mentorId)) throw new DataError('INVALID_ID', 'Malformed mentor id.');
  await dbConnect();

  const mentor = await MentorProfile.findById(mentorId);
  if (!mentor) throw new DataError('MENTOR_NOT_FOUND', 'No such mentor.');

  if (!FROM[action].includes(mentor.status)) {
    throw new DataError('INVALID_TRANSITION', `A mentor who is ${mentor.status.replace('_', ' ')} cannot be ${action}d.`);
  }

  if (profileVector !== undefined) {
    if (!isValidVector(profileVector)) {
      throw new DataError('INVALID_VECTOR', `The interest profile needs ${VECTOR_DIMENSION} values between 0 and 1.`);
    }
    mentor.profileVector = profileVector;
  }

  if (action === 'approve' || action === 'reinstate') {
    if (!isValidVector(mentor.profileVector)) {
      throw new DataError('INVALID_VECTOR', 'Set the mentor’s interest profile before approving.');
    }
    mentor.status = 'approved';
    mentor.approvedBy = adminUserId as never;
    mentor.approvedAt = new Date();
  } else if (action === 'reject') {
    mentor.status = 'rejected';
  } else {
    mentor.status = 'suspended';
  }

  // .save() runs the model's validation: approval must be attributed, and
  // `vetted` is re-derived from the new status.
  await mentor.save();
  const fresh = await MentorProfile.findById(mentorId)
    .populate('user', 'email')
    .populate('approvedBy', 'name')
    .lean();
  return toReviewDTO(fresh);
}

export interface PlatformCounts {
  students: number;
  mentors: Record<MentorStatus, number>;
  bookings: number;
  upcomingBookings: number;
  discoveryResults: number;
}

export async function platformCounts(now = new Date()): Promise<PlatformCounts> {
  await dbConnect();
  const [students, mentors, bookings, upcomingBookings, discoveryResults] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    countMentorsByStatus(),
    Booking.countDocuments(),
    Booking.countDocuments({ status: { $in: ['pending', 'confirmed'] }, startsAt: { $gte: now } }),
    DiscoveryResult.countDocuments(),
  ]);
  return { students, mentors, bookings, upcomingBookings, discoveryResults };
}
