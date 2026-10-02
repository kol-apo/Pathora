import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { SECTORS, type Sector } from '@/lib/types';

export interface IStudentProfile {
  _id: Types.ObjectId;
  user: Types.ObjectId;

  initials: string;
  university?: string;
  field?: string;
  year?: number;

  /** Denormalised from the most recent DiscoveryResult so the dashboard reads one doc. */
  careerMatch?: string;
  matchedSector?: Sector;
  latestDiscovery?: Types.ObjectId;

  savedMentors: Types.ObjectId[];
  savedOpportunities: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const StudentProfileSchema = new Schema<IStudentProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

    initials: { type: String, required: true, uppercase: true, maxlength: 3 },
    university: { type: String, trim: true },
    field: { type: String, trim: true },
    year: { type: Number, min: 1, max: 8 },

    careerMatch: { type: String },
    matchedSector: { type: String, enum: SECTORS },
    latestDiscovery: { type: Schema.Types.ObjectId, ref: 'DiscoveryResult' },

    // Small, bounded lists that are always read with the profile — cheaper as
    // arrays of refs than as a separate join collection.
    savedMentors: [{ type: Schema.Types.ObjectId, ref: 'MentorProfile' }],
    savedOpportunities: [{ type: Schema.Types.ObjectId, ref: 'Opportunity' }],
  },
  { timestamps: true },
);

const StudentProfile: Model<IStudentProfile> =
  (mongoose.models.StudentProfile as Model<IStudentProfile>) ??
  mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);

export default StudentProfile;
