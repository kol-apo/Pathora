import mongoose, { Schema, type Model, type Types } from 'mongoose';

/**
 * Interaction events for the research dataset.
 *
 * Deliberately carries `participantCode` and NO user or student reference, so
 * the dataset holds no direct identifier by construction: an export of this
 * collection cannot be joined back to a name or email without the separately
 * protected StudentProfile collection. Do not add a user field here.
 */
export interface IAnalyticsEvent {
  _id: Types.ObjectId;
  participantCode: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    participantCode: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, required: true, default: Date.now },
  },
  // Reject unknown fields outright, so an identifier cannot slip in by accident.
  { strict: 'throw' },
);

AnalyticsEventSchema.index({ participantCode: 1, occurredAt: 1 });
AnalyticsEventSchema.index({ eventType: 1, occurredAt: 1 });

const AnalyticsEvent: Model<IAnalyticsEvent> =
  (mongoose.models.AnalyticsEvent as Model<IAnalyticsEvent>) ??
  mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);

export default AnalyticsEvent;
