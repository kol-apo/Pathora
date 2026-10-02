import mongoose, { Schema, type Model, type Types } from 'mongoose';

/** A window within a single day, as minutes from local midnight (0–1440). */
export interface IWindow {
  startMinute: number;
  endMinute: number;
}

export interface IWeeklyRule extends IWindow {
  /** 0 = Sunday … 6 = Saturday, in the mentor's own timezone. */
  dayOfWeek: number;
}

export interface IException {
  /** Calendar day in the mentor's timezone, as "YYYY-MM-DD". */
  date: string;
  /** True = whole day off, overriding the weekly rules. */
  blocked: boolean;
  /** When `blocked` is false, these windows replace that day's weekly rules. */
  windows: IWindow[];
}

export interface IAvailability {
  _id: Types.ObjectId;
  mentor: Types.ObjectId;

  weekly: IWeeklyRule[];
  exceptions: IException[];

  /** Length of one session. */
  sessionMinutes: number;
  /** Gap enforced between two sessions. */
  bufferMinutes: number;
  /** Nothing bookable sooner than this many hours from now. */
  leadTimeHours: number;
  /** Nothing bookable further out than this many days. */
  horizonDays: number;

  createdAt: Date;
  updatedAt: Date;
}

const WindowSchema = new Schema<IWindow>(
  {
    startMinute: { type: Number, required: true, min: 0, max: 1440 },
    endMinute: { type: Number, required: true, min: 0, max: 1440 },
  },
  { _id: false },
);

const WeeklyRuleSchema = new Schema<IWeeklyRule>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startMinute: { type: Number, required: true, min: 0, max: 1440 },
    endMinute: { type: Number, required: true, min: 0, max: 1440 },
  },
  { _id: false },
);

const ExceptionSchema = new Schema<IException>(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    blocked: { type: Boolean, default: true },
    windows: { type: [WindowSchema], default: [] },
  },
  { _id: false },
);

/**
 * A mentor's bookable time, stored as recurring rules rather than pre-generated
 * slot rows. Concrete slots are computed on read (see `lib/booking/slots.ts`),
 * so editing a schedule never means rewriting hundreds of documents.
 *
 * All minutes here are LOCAL to `MentorProfile.timezone`. Conversion to UTC
 * happens at slot-generation time — nothing in this collection is UTC.
 */
const AvailabilitySchema = new Schema<IAvailability>(
  {
    mentor: {
      type: Schema.Types.ObjectId,
      ref: 'MentorProfile',
      required: true,
      unique: true,
    },

    weekly: { type: [WeeklyRuleSchema], default: [] },
    exceptions: { type: [ExceptionSchema], default: [] },

    sessionMinutes: { type: Number, default: 45, min: 15, max: 180 },
    bufferMinutes: { type: Number, default: 15, min: 0, max: 120 },
    leadTimeHours: { type: Number, default: 24, min: 0 },
    horizonDays: { type: Number, default: 30, min: 1, max: 180 },
  },
  { timestamps: true },
);

/** A window that ends before it starts would silently produce zero slots. */
function assertOrderedWindows(windows: IWindow[], label: string) {
  for (const w of windows) {
    if (w.endMinute <= w.startMinute) {
      throw new Error(`${label}: endMinute must be greater than startMinute.`);
    }
  }
}

// Mongoose 9 pre-hooks take no `next` callback — throwing fails validation.
AvailabilitySchema.pre('validate', function () {
  assertOrderedWindows(this.weekly, 'weekly rule');
  for (const ex of this.exceptions) {
    assertOrderedWindows(ex.windows, `exception ${ex.date}`);
  }
});

const Availability: Model<IAvailability> =
  (mongoose.models.Availability as Model<IAvailability>) ??
  mongoose.model<IAvailability>('Availability', AvailabilitySchema);

export default Availability;
