import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { SECTORS, type Sector } from '@/lib/types';

export type OpportunityType = 'Fellowship' | 'Hackathon' | 'Internship' | 'Campus program';

export const OPPORTUNITY_TYPES: OpportunityType[] = [
  'Fellowship',
  'Hackathon',
  'Internship',
  'Campus program',
];

export interface IOpportunity {
  _id: Types.ObjectId;
  title: string;
  organisation: string;
  type: OpportunityType;
  sector: Sector;
  description: string;
  url: string;

  /**
   * A real date, or null for rolling applications. Stored as a Date rather than
   * the display string so it can be sorted and filtered; "Closes 14 Sep" is a
   * formatting concern for the UI.
   */
  deadline: Date | null;

  published: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema = new Schema<IOpportunity>(
  {
    title: { type: String, required: true, trim: true },
    organisation: { type: String, required: true, trim: true },
    type: { type: String, enum: OPPORTUNITY_TYPES, required: true },
    sector: { type: String, enum: SECTORS, required: true },
    description: { type: String, required: true, maxlength: 1000 },
    url: { type: String, required: true },

    deadline: { type: Date, default: null },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/** The feed: published opportunities in a sector, closing soonest first. */
OpportunitySchema.index({ published: 1, sector: 1, deadline: 1 });

const Opportunity: Model<IOpportunity> =
  (mongoose.models.Opportunity as Model<IOpportunity>) ??
  mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);

export default Opportunity;
