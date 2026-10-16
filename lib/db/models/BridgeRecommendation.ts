import mongoose, { Schema, type Model, type Types } from 'mongoose';

/**
 * One mentor surfaced on one discovery result: the bridge from advice to a
 * person. Each result gets exactly three, ranked 1 to 3.
 *
 * This collection exists so bridge conversion is measured per result rather
 * than inferred from bookings: when each recommendation was surfaced, viewed
 * and booked. It holds the primary dependent variable of the study.
 */
export interface IBridgeRecommendation {
  _id: Types.ObjectId;
  discoveryResult: Types.ObjectId;
  mentor: Types.ObjectId;
  rank: number;
  /** Cosine similarity between the student's and the mentor's vectors. */
  similarity: number;
  surfacedAt: Date;
  viewedAt?: Date;
  bookedAt?: Date;
}

const BridgeRecommendationSchema = new Schema<IBridgeRecommendation>({
  discoveryResult: { type: Schema.Types.ObjectId, ref: 'DiscoveryResult', required: true },
  mentor: { type: Schema.Types.ObjectId, ref: 'MentorProfile', required: true },
  rank: { type: Number, required: true, min: 1, max: 3 },
  similarity: { type: Number, required: true, min: -1, max: 1 },
  surfacedAt: { type: Date, required: true, default: Date.now },
  viewedAt: { type: Date },
  bookedAt: { type: Date },
});

// Mongoose 9 pre-hooks take no `next` callback — throwing fails validation.
BridgeRecommendationSchema.pre('validate', function () {
  // The funnel only moves forward: a booking cannot precede the view.
  if (this.bookedAt && this.viewedAt && this.bookedAt < this.viewedAt) {
    throw new Error('bookedAt cannot be earlier than viewedAt.');
  }
});

/** A mentor appears at most once per result, and each rank is used once. */
BridgeRecommendationSchema.index(
  { discoveryResult: 1, mentor: 1 },
  { unique: true, name: 'one_mentor_per_result' },
);
BridgeRecommendationSchema.index(
  { discoveryResult: 1, rank: 1 },
  { unique: true, name: 'one_mentor_per_rank' },
);
BridgeRecommendationSchema.index({ mentor: 1 });

const BridgeRecommendation: Model<IBridgeRecommendation> =
  (mongoose.models.BridgeRecommendation as Model<IBridgeRecommendation>) ??
  mongoose.model<IBridgeRecommendation>('BridgeRecommendation', BridgeRecommendationSchema);

export default BridgeRecommendation;
