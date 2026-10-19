import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { SECTORS, type Sector } from '@/lib/types';
import {
  OPPORTUNITY_SOURCES,
  OPPORTUNITY_TYPES,
  type OpportunitySource,
  type OpportunityType,
} from '@/lib/opportunities/sources';

export { OPPORTUNITY_TYPES };
export type { OpportunityType };

/**
 * A scholarship, fellowship, internship, job or similar, listed on the
 * Opportunities page. Most are read from publishers' RSS feeds; ALU SPD and
 * Pathora listings are added by an admin. Every one links to the publisher's
 * own page, which has the full details.
 */
export interface IOpportunity {
  _id: Types.ObjectId;
  title: string;
  organisation: string;
  type: OpportunityType;
  /** The sector it most clearly belongs to, or null when open to anyone. */
  sector: Sector | null;
  /** Plain-text summary. Never HTML. */
  description: string;
  /** The publisher's page. Unique, so a listing is stored once however often feeds are read. */
  url: string;

  /**
   * A real date, or null when no deadline is stated (rolling, or "check the
   * site"). Stored as a Date so it can be sorted and filtered.
   */
  deadline: Date | null;

  source: OpportunitySource;
  /** When the publisher posted it. */
  publishedAt?: Date;

  published: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema = new Schema<IOpportunity>(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    organisation: { type: String, default: '', trim: true, maxlength: 200 },
    type: { type: String, enum: OPPORTUNITY_TYPES, required: true },
    sector: { type: String, enum: [...SECTORS, null], default: null },
    description: { type: String, default: '', maxlength: 1000 },
    // Only web addresses, so a "javascript:" link can never reach a student.
    url: { type: String, required: true, trim: true, match: /^https?:\/\/\S+$/ },

    deadline: { type: Date, default: null },
    source: { type: String, enum: OPPORTUNITY_SOURCES, default: 'pathora' },
    publishedAt: { type: Date },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

OpportunitySchema.index({ url: 1 }, { unique: true, name: 'one_listing_per_url' });
/** The Opportunities page: open listings, closing soonest first. */
OpportunitySchema.index({ published: 1, deadline: 1 });
OpportunitySchema.index({ published: 1, sector: 1, deadline: 1 });

const Opportunity: Model<IOpportunity> =
  (mongoose.models.Opportunity as Model<IOpportunity>) ??
  mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);

export default Opportunity;
