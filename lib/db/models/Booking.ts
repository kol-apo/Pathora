import mongoose, { Schema, type Model, type Types } from 'mongoose';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

/** Statuses that still occupy the mentor's calendar slot. */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'completed',
  'no_show',
];

export interface IBookingNote {
  body: string;
  author: Types.ObjectId;
  createdAt: Date;
}

export interface IBookingRating {
  score: number;
  comment?: string;
  createdAt: Date;
}

export interface IBooking {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  mentor: Types.ObjectId;

  topic: string;

  /** Always UTC. The mentor's local time is derived from MentorProfile.timezone. */
  startsAt: Date;
  endsAt: Date;

  status: BookingStatus;

  /**
   * Mirrors `status`, true for anything in ACTIVE_BOOKING_STATUSES. Exists only
   * so the slot-uniqueness index can be a partial index on a boolean equality,
   * which every MongoDB version supports. Maintained by a pre-validate hook —
   * never set it by hand.
   */
  active: boolean;

  /** Whereby room, created when the booking is confirmed. */
  roomUrl?: string;
  roomId?: string;

  notes: IBookingNote[];
  rating?: IBookingRating;

  cancelledBy?: Types.ObjectId;
  cancelReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const BookingNoteSchema = new Schema<IBookingNote>(
  {
    body: { type: String, required: true, maxlength: 2000 },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const BookingRatingSchema = new Schema<IBookingRating>(
  {
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const BookingSchema = new Schema<IBooking>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mentor: { type: Schema.Types.ObjectId, ref: 'MentorProfile', required: true },

    topic: { type: String, required: true, trim: true, maxlength: 200 },

    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
      default: 'pending',
      required: true,
    },
    active: { type: Boolean, required: true, default: true },

    roomUrl: { type: String },
    roomId: { type: String },

    // Bounded and always read alongside the booking, so embedded rather than
    // split into their own collection.
    notes: { type: [BookingNoteSchema], default: [] },
    rating: { type: BookingRatingSchema },

    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

// Mongoose 9 pre-hooks take no `next` callback — throwing fails validation.
BookingSchema.pre('validate', function () {
  if (this.endsAt <= this.startsAt) {
    throw new Error('endsAt must be after startsAt.');
  }
  // Keep the index discriminator in step with status on every write.
  this.active = ACTIVE_BOOKING_STATUSES.includes(this.status);
});

/**
 * The double-booking guarantee, enforced by the database rather than by
 * application logic — two concurrent requests for the same slot cannot both
 * win, however the race is timed.
 *
 * Partial, so a cancelled booking releases its slot for rebooking.
 */
BookingSchema.index(
  { mentor: 1, startsAt: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
    name: 'one_active_booking_per_slot',
  },
);

/** Dashboard: a student's sessions, soonest first. */
BookingSchema.index({ student: 1, startsAt: -1 });
/** Mentor console: upcoming sessions for a mentor. */
BookingSchema.index({ mentor: 1, status: 1, startsAt: 1 });

const Booking: Model<IBooking> =
  (mongoose.models.Booking as Model<IBooking>) ??
  mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
