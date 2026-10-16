import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { SECTORS, type Sector } from '@/lib/types';

export type ResourceType =
  | 'internship'
  | 'fellowship'
  | 'scholarship'
  | 'hackathon'
  | 'graduate_programme'
  | 'ambassador_programme';

export const RESOURCE_TYPES: ResourceType[] = [
  'internship',
  'fellowship',
  'scholarship',
  'hackathon',
  'graduate_programme',
  'ambassador_programme',
];

/**
 * Allow-list backing the prompt guardrails. A programme absent here is treated
 * as hallucinated: the post-generation validator rejects any roadmap that names
 * a programme not in this collection, whether or not the programme exists.
 *
 * Seeded from lib/research/verified-resources.json, which the prompt validator
 * (prompts/validate_prompt.py) also reads, so the two cannot drift apart.
 */
export interface IVerifiedResource {
  _id: Types.ObjectId;
  name: string;
  organisation?: string;
  /** Null means open to every sector. */
  sector: Sector | null;
  type?: ResourceType;
  /** Countries the programme accepts applicants from. Empty means no restriction. */
  countries: string[];
  url: string;
  verifiedAt: Date;
  isActive: boolean;
}

const VerifiedResourceSchema = new Schema<IVerifiedResource>({
  name: { type: String, required: true, unique: true, trim: true },
  organisation: { type: String, trim: true },
  // enum validation skips null, so null (open to every sector) is allowed.
  sector: { type: String, enum: SECTORS, default: null },
  type: { type: String, enum: RESOURCE_TYPES },
  countries: { type: [String], default: [] },
  url: { type: String, required: true },
  verifiedAt: { type: Date, required: true, default: Date.now },
  isActive: { type: Boolean, default: true },
});

VerifiedResourceSchema.index({ sector: 1 }, { partialFilterExpression: { isActive: true } });

const VerifiedResource: Model<IVerifiedResource> =
  (mongoose.models.VerifiedResource as Model<IVerifiedResource>) ??
  mongoose.model<IVerifiedResource>('VerifiedResource', VerifiedResourceSchema);

export default VerifiedResource;
