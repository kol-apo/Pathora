import mongoose, { Schema, type Model, type Types } from 'mongoose';

export type UserRole = 'student' | 'mentor' | 'admin';

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  /** Set once the address is confirmed; null until then. */
  emailVerified: Date | null;
  image?: string;
  /** bcrypt hash. `select: false`, so it is never returned unless asked for. */
  passwordHash?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The account record. Deliberately shaped to match what the Auth.js MongoDB
 * adapter expects (`name` / `email` / `emailVerified` / `image`) so the two can
 * share this collection — we add `passwordHash` and `role` on top.
 *
 * Public-facing mentor details live on MentorProfile, not here.
 */
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    emailVerified: { type: Date, default: null },
    image: { type: String },
    passwordHash: { type: String, select: false },
    role: {
      type: String,
      enum: ['student', 'mentor', 'admin'],
      required: true,
      default: 'student',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Belt and braces: even if a query explicitly selects passwordHash,
      // it must never survive serialisation to a response body.
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ?? mongoose.model<IUser>('User', UserSchema);

export default User;
