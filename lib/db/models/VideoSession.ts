import mongoose, { Schema, type Model, type Types } from 'mongoose';

export type SessionStatus = 'provisioned' | 'in_progress' | 'ended' | 'expired';

/**
 * Timing metadata for the video call behind one booking.
 *
 * There is deliberately NO recording field anywhere in the data model. The
 * participant consent form states that sessions are not recorded, so the
 * absence is a compliance requirement, not an omission.
 */
export interface IVideoSession {
  _id: Types.ObjectId;
  booking: Types.ObjectId;
  /** The Daily room's name, "pathora-<booking id>". */
  roomName: string;
  roomUrl: string;
  roomExpiresAt: Date;
  status: SessionStatus;
  studentJoinedAt?: Date;
  mentorJoinedAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  /** Derived from startedAt and endedAt; never set by hand. */
  durationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

const VideoSessionSchema = new Schema<IVideoSession>(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    roomName: { type: String, required: true },
    roomUrl: { type: String, required: true },
    roomExpiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['provisioned', 'in_progress', 'ended', 'expired'],
      default: 'provisioned',
      required: true,
    },
    studentJoinedAt: { type: Date },
    mentorJoinedAt: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    durationSeconds: { type: Number, min: 0 },
  },
  // Reject unknown fields, so nothing like a recording URL can be stored.
  { timestamps: true, strict: 'throw' },
);

// Mongoose 9 pre-hooks take no `next` callback — throwing fails validation.
VideoSessionSchema.pre('validate', function () {
  if (this.startedAt && this.endedAt) {
    if (this.endedAt < this.startedAt) throw new Error('endedAt cannot be earlier than startedAt.');
    this.durationSeconds = Math.round((this.endedAt.getTime() - this.startedAt.getTime()) / 1000);
  } else {
    this.durationSeconds = undefined;
  }
});

VideoSessionSchema.index({ status: 1 });

const VideoSession: Model<IVideoSession> =
  (mongoose.models.VideoSession as Model<IVideoSession>) ??
  mongoose.model<IVideoSession>('VideoSession', VideoSessionSchema);

export default VideoSession;
