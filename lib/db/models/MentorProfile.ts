import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { SECTORS, type Sector } from '@/lib/types';

export interface IMentorProfile {
  _id: Types.ObjectId;
  user: Types.ObjectId;

  /** Denormalised from User so /explore can search and sort in one collection. */
  displayName: string;
  initials: string;

  role: string;
  company: string;
  sector: Sector;
  experience: number;
  /** The two short pills on the consultant card. */
  focus: string[];
  /** Longer expertise list shown on the profile page. */
  tags: string[];
  bio: string;
  helpWith: string[];

  /** IANA zone, e.g. "Africa/Lagos". Every availability rule is read in this zone. */
  timezone: string;

  /** Backs the "Vetted by Pathora" badge. */
  vetted: boolean;
  vettedAt?: Date;
  vettedBy?: Types.ObjectId;

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
    company: { type: String, required: true, trim: true },
    sector: { type: String, enum: SECTORS, required: true, index: true },
    experience: { type: Number, required: true, min: 0, max: 60 },
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

    timezone: { type: String, required: true, default: 'Africa/Lagos' },

    vetted: { type: Boolean, default: false, index: true },
    vettedAt: { type: Date },
    vettedBy: { type: Schema.Types.ObjectId, ref: 'User' },

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

const MentorProfile: Model<IMentorProfile> =
  (mongoose.models.MentorProfile as Model<IMentorProfile>) ??
  mongoose.model<IMentorProfile>('MentorProfile', MentorProfileSchema);

export default MentorProfile;
