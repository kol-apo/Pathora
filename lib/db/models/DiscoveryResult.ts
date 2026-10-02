import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { SECTORS, type Sector } from '@/lib/types';

export interface IDiscoveryAnswers {
  status: number;
  interests: number[];
  environment: number;
  strength: number;
  vision: number;
  field?: string;
}

export interface IRoadmapPhase {
  period: string;
  focus: string;
  actions: string[];
}

export interface ISecondaryMatch {
  title: string;
  sector: Sector;
  description: string;
  skills: string[];
}

export interface IDiscoveryResult {
  _id: Types.ObjectId;
  /** Null for visitors who take the quiz before signing up. */
  student: Types.ObjectId | null;

  answers: IDiscoveryAnswers;

  primary: {
    title: string;
    sector: Sector;
    description: string;
    why: string;
    africanMarket: string;
    skills: string[];
    roadmap: IRoadmapPhase[];
  };
  secondary: ISecondaryMatch[];

  /** Provenance — which engine produced this, so results stay comparable
   *  after a model swap. "mock" for the offline fallback. */
  provider: string;
  model: string;
  /** Milliseconds the generation took; useful for spotting a slow provider. */
  latencyMs?: number;

  createdAt: Date;
  updatedAt: Date;
}

const RoadmapPhaseSchema = new Schema<IRoadmapPhase>(
  {
    period: { type: String, required: true },
    focus: { type: String, required: true },
    actions: { type: [String], default: [] },
  },
  { _id: false },
);

const SecondaryMatchSchema = new Schema<ISecondaryMatch>(
  {
    title: { type: String, required: true },
    sector: { type: String, enum: SECTORS, required: true },
    description: { type: String, required: true },
    skills: { type: [String], default: [] },
  },
  { _id: false },
);

/**
 * One completed run of the discovery agent. Answers are stored alongside the
 * result so a run can be re-explained, audited, or regenerated against a
 * different model later.
 */
const DiscoveryResultSchema = new Schema<IDiscoveryResult>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    answers: {
      status: { type: Number, required: true },
      interests: { type: [Number], default: [] },
      environment: { type: Number, required: true },
      strength: { type: Number, required: true },
      vision: { type: Number, required: true },
      field: { type: String },
    },

    primary: {
      title: { type: String, required: true },
      sector: { type: String, enum: SECTORS, required: true },
      description: { type: String, required: true },
      why: { type: String, required: true },
      africanMarket: { type: String, required: true },
      skills: { type: [String], default: [] },
      roadmap: { type: [RoadmapPhaseSchema], default: [] },
    },
    secondary: { type: [SecondaryMatchSchema], default: [] },

    provider: { type: String, required: true },
    model: { type: String, required: true },
    latencyMs: { type: Number },
  },
  { timestamps: true },
);

/** A student's discovery history, newest first. */
DiscoveryResultSchema.index({ student: 1, createdAt: -1 });

const DiscoveryResult: Model<IDiscoveryResult> =
  (mongoose.models.DiscoveryResult as Model<IDiscoveryResult>) ??
  mongoose.model<IDiscoveryResult>('DiscoveryResult', DiscoveryResultSchema);

export default DiscoveryResult;
