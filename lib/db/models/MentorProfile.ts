import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { SECTORS, type Sector } from '@/lib/types';
import { VECTOR_DIMENSION, isValidVector } from '@/lib/matching/similarity';
import { LINK_KINDS, MAX_LINKS, type LinkKind } from '@/lib/profileLinks';
import { MENTOR_SOURCES, type MentorSource } from '@/lib/partners';

export type MentorStatus = 'pending_review' | 'approved' | 'rejected' | 'suspended';
export const MENTOR_STATUSES: MentorStatus[] = ['pending_review', 'approved', 'rejected', 'suspended'];

export interface IMentorProfile {
  _id: Types.ObjectId;
  user: Types.ObjectId;

  /** Denormalised from User so /explore can search and sort in one collection. */
  displayName: string;
  initials: string;

  role: string;
  /** Empty when not known, e.g. for partner mentors listed from their directory. */
  company: string;
  sector: Sector;
  /** Years of experience. Absent when not known, rather than a made-up number. */
  experience?: number;
  /** The two short pills on the consultant card. */
  focus: string[];
  /** Longer expertise list shown on the profile page. */
  tags: string[];
  bio: string;
  helpWith: string[];

  /** Public profiles, shown on the consultant page. Stored as full https addresses. */
  socials?: { linkedin?: string; x?: string };
  /** Up to five other links: portfolio, publications, videos, a website. */
  links: { kind: LinkKind; url: string; title?: string }[];

  /** Headshot: a file under /public/mentors, or an https address. */
  photo?: string;
  /** Where this mentor came from: 'pathora' (applied here) or a partner organisation. */
  source: MentorSource;

  /** IANA zone, e.g. "Africa/Lagos". Every availability rule is read in this zone. */
  timezone: string;

  /** Where the application is in review. Only `approved` mentors are shown to students. */
  status: MentorStatus;
  /** The admin who approved this mentor. Required once approved, so vetting is auditable. */
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  /**
   * Derived from `status`, never set by hand: true exactly when approved.
   * Kept as its own field because every student-facing query filters on it.
   * Backs the "Vetted by Pathora" badge.
   */
  vetted: boolean;
  /** Agreed to the Pathora code of conduct during application. */
  codeOfConductOk: boolean;
  country?: string;

  /**
   * The mentor's position on the five interest axes defined in
   * prompts/discovery.json (vector_space), each 0 to 1. Set at approval time.
   * Bridge matching compares it with a student's vector by cosine similarity.
   */
  profileVector?: number[];

  /** Accepting new bookings at all — independent of whether slots are free. */
  acceptingBookings: boolean;

  // Denormalised aggregates, recomputed when a booking completes or is rated.
  ratingAvg: number;
  ratingCount: number;
  sessionCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const MentorProfileSchema = new Schema<IMentorProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    displayName: { type: String, required: true, trim: true },
    initials: { type: String, required: true, uppercase: true, maxlength: 3 },

    role: { type: String, required: true, trim: true },
    company: { type: String, default: '', trim: true },
    sector: { type: String, enum: SECTORS, required: true, index: true },
    experience: { type: Number, min: 0, max: 60 },
    focus: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 3,
        message: 'A card shows at most 3 focus pills.',
      },
    },
    tags: { type: [String], default: [] },
    bio: { type: String, required: true, maxlength: 2000 },
    helpWith: { type: [String], default: [] },

    socials: {
      linkedin: { type: String, match: /^https?:\/\//, trim: true },
      x: { type: String, match: /^https?:\/\//, trim: true },
    },
    links: {
      type: [
        new Schema(
          {
            kind: { type: String, enum: LINK_KINDS, required: true },
            // Only web addresses: a "javascript:" link must never reach a student.
            url: { type: String, required: true, match: /^https?:\/\//, trim: true },
            title: { type: String, trim: true, maxlength: 60 },
          },
          { _id: false },
        ),
      ],
      default: [],
      validate: {
        validator: (v: unknown[]) => v.length <= MAX_LINKS,
        message: `At most ${MAX_LINKS} links.`,
      },
    },

    photo: {
      type: String,
      trim: true,
      // A file this site serves, or a secure web address. Nothing else reaches an <img>.
      match: /^(\/mentors\/[a-z0-9-]+\.(webp|png|jpe?g)|https:\/\/\S+)$/,
    },
    source: { type: String, enum: MENTOR_SOURCES, default: 'pathora', index: true },

    timezone: { type: String, required: true, default: 'Africa/Lagos' },

    status: { type: String, enum: MENTOR_STATUSES, default: 'pending_review', index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    vetted: { type: Boolean, default: false, index: true },
    codeOfConductOk: { type: Boolean, default: false },
    country: { type: String, trim: true },

    profileVector: {
      type: [Number],
      default: undefined,
      validate: {
        validator: (v?: number[]) => v === undefined || isValidVector(v),
        message: `profileVector must have exactly ${VECTOR_DIMENSION} numbers between 0 and 1.`,
      },
    },

    acceptingBookings: { type: Boolean, default: true },

    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    sessionCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

/**
 * Free-text search for /explore. Weighted so a name match outranks a company
 * match, which outranks a skill match.
 */
MentorProfileSchema.index(
  { displayName: 'text', role: 'text', company: 'text', focus: 'text', tags: 'text' },
  {
    name: 'mentor_search',
    weights: { displayName: 10, role: 5, company: 4, focus: 2, tags: 1 },
  },
);

/** The default explore listing: vetted mentors in a sector, most experienced first. */
MentorProfileSchema.index({ vetted: 1, sector: 1, experience: -1 });

// Mongoose 9 pre-hooks take no `next` callback — throwing fails validation.
MentorProfileSchema.pre('validate', function () {
  // An approval must name who approved it and when, or vetting is not auditable.
  if (this.status === 'approved' && (!this.approvedBy || !this.approvedAt)) {
    throw new Error('An approved mentor must record approvedBy and approvedAt.');
  }
  this.vetted = this.status === 'approved';
});

/**
 * Keep `vetted` in step on update queries too, which skip document hooks.
 * Any update that sets `status` also sets the matching `vetted`.
 */
MentorProfileSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function () {
  const update = this.getUpdate() as Record<string, Record<string, unknown> | unknown> | null;
  if (!update) return;
  const set = (update.$set ?? update) as Record<string, unknown>;
  if (typeof set.status === 'string') {
    this.setUpdate({ ...update, $set: { ...(update.$set as object), vetted: set.status === 'approved' } });
  }
});

const MentorProfile: Model<IMentorProfile> =
  (mongoose.models.MentorProfile as Model<IMentorProfile>) ??
  mongoose.model<IMentorProfile>('MentorProfile', MentorProfileSchema);

export default MentorProfile;
