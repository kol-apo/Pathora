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

/** Booked time is claimed in blocks of this many minutes (see `blocksFor`). */
export const BLOCK_MINUTES = 15;
/** The break kept free after every session. Matches Availability.bufferMinutes. */
export const BOOKING_BUFFER_MINUTES = 15;

/**
 * The 15-minute blocks a booking occupies: from its start to the end of the
 * break after it. Two bookings with the same mentor that overlap, or that
 * leave less than the break between them, always share at least one block.
 * The start is rounded down and the end up, so an odd time can only make the
 * check stricter, never looser.
 */
export function blocksFor(startsAt: Date, endsAt: Date, bufferMinutes = BOOKING_BUFFER_MINUTES): Date[] {
  const step = BLOCK_MINUTES * 60_000;
  const end = endsAt.getTime() + bufferMinutes * 60_000;
  const blocks: Date[] = [];
  for (let t = Math.floor(startsAt.getTime() / step) * step; t < end; t += step) blocks.push(new Date(t));
  return blocks;
}

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

  /** The discovery result this booking came from, if any. */
  discoveryResult?: Types.ObjectId;
  /**
   * True when booked from a mentor surfaced on that result (the bridge). This
   * is the conversion the study measures; it requires `discoveryResult`.
   */
  viaBridge: boolean;

  /**
   * Mirrors `status`, true for anything in ACTIVE_BOOKING_STATUSES. Exists only
   * so the slot-uniqueness index can be a partial index on a boolean equality,
   * which every MongoDB version supports. Maintained by a pre-validate hook —
   * never set it by hand.
   */
  active: boolean;

  notes: IBookingNote[];
  rating?: IBookingRating;

  /** Derived from startsAt and endsAt by a pre-validate hook. Never set it by hand. */
  blocks: Date[];

  cancelledBy?: Types.ObjectId;
  cancelledAt?: Date;
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

    discoveryResult: { type: Schema.Types.ObjectId, ref: 'DiscoveryResult' },
    viaBridge: { type: Boolean, default: false },

    // Bounded and always read alongside the booking, so embedded rather than
    // split into their own collection.
    notes: { type: [BookingNoteSchema], default: [] },
    blocks: { type: [Date], default: undefined },
    rating: { type: BookingRatingSchema },

    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: { type: Date },
    cancelReason: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

// Mongoose 9 pre-hooks take no `next` callback — throwing fails validation.
BookingSchema.pre('validate', function () {
  if (this.endsAt <= this.startsAt) {
    throw new Error('endsAt must be after startsAt.');
  }
  if (this.viaBridge && !this.discoveryResult) {
    throw new Error('A bridge booking must reference the discovery result it came from.');
  }
  if (this.status === 'cancelled' && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }
  // Keep the index discriminator in step with status on every write.
  this.active = ACTIVE_BOOKING_STATUSES.includes(this.status);
  // And the claimed blocks in step with the time.
  this.blocks = blocksFor(this.startsAt, this.endsAt);
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

/**
 * The overlap guarantee. Sessions can start every 15 minutes, so two clashing
 * bookings may have different start times; the index above would not see
 * them. Here every active booking claims its blocks, and MongoDB refuses a
 * second active booking that claims any of the same blocks for the same
 * mentor, however two requests are timed. (`blocks` must exist: bookings
 * saved before this change gain it on their next save.)
 */
BookingSchema.index(
  { mentor: 1, blocks: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true, blocks: { $exists: true } },
    name: 'no_overlapping_active_bookings',
  },
);

/** Dashboard: a student's sessions, soonest first. */
BookingSchema.index({ student: 1, startsAt: -1 });
/** Mentor console: upcoming sessions for a mentor. */
BookingSchema.index({ mentor: 1, status: 1, startsAt: 1 });
/** Research: bookings that came through the bridge, per result. */
BookingSchema.index({ discoveryResult: 1 }, { partialFilterExpression: { viaBridge: true } });

const Booking: Model<IBooking> =
  (mongoose.models.Booking as Model<IBooking>) ??
  mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
