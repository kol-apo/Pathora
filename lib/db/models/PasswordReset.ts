import mongoose, { Schema, type Model, type Types } from 'mongoose';

/**
 * A password-reset link. Only a SHA-256 hash of the token is stored, so a
 * copy of this collection cannot be used to reset anyone's password. Each
 * link works once, for one hour; MongoDB removes expired ones on its own.
 */
export interface IPasswordReset {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

/** Deleted by MongoDB once expired. */
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expire_reset_links' });

const PasswordReset: Model<IPasswordReset> =
  (mongoose.models.PasswordReset as Model<IPasswordReset>) ??
  mongoose.model<IPasswordReset>('PasswordReset', PasswordResetSchema);

export default PasswordReset;
