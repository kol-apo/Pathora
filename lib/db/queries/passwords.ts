import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import dbConnect from '../connect';
import { PasswordReset, User } from '../models';
import { sendEmail, type SendResult } from '@/lib/email/send';
import { isPlaceholderEmail } from '@/lib/partners';
import { DataError } from './errors';

/**
 * Password resets by email.
 *
 * The emailed link carries a random token; only its SHA-256 hash is stored.
 * A link works once, within an hour. Asking for a reset never reveals whether
 * an email has an account: the answer is the same either way.
 */

const BCRYPT_ROUNDS = 12;
const LINK_MINUTES = 60;
/** Per account per hour, so the reset form cannot be used to flood someone's inbox. */
const MAX_LINKS_PER_HOUR = 3;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function requestPasswordReset(
  email: string,
  siteUrl: string,
  options: { now?: Date; send?: (e: Parameters<typeof sendEmail>[0]) => Promise<SendResult> } = {},
): Promise<void> {
  const { now = new Date(), send = sendEmail } = options;
  await dbConnect();
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('_id name email').lean();
  if (!user || isPlaceholderEmail(user.email)) return;

  const recent = await PasswordReset.countDocuments({
    user: user._id,
    createdAt: { $gte: new Date(now.getTime() - 3_600_000) },
  });
  if (recent >= MAX_LINKS_PER_HOUR) return;

  const token = randomBytes(32).toString('base64url');
  await PasswordReset.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(now.getTime() + LINK_MINUTES * 60_000),
  });

  const firstName = user.name.split(' ')[0] || 'there';
  await send({
    to: user.email,
    subject: 'Reset your Pathora password',
    text: `Hi ${firstName},

Someone asked to reset the password for your Pathora account. If it was you, choose a new password here:

${siteUrl}/reset-password?token=${token}

The link works once, for the next ${LINK_MINUTES} minutes. If you did not ask for this, you can ignore this email: your password stays the same.

Pathora`,
  });
}

/**
 * Set a new password from a reset link. Every session signed in before now
 * is ended (see the jwt callback in auth.ts), and the account's other
 * unused links stop working.
 */
export async function resetPassword(token: string, newPassword: string, now = new Date()): Promise<void> {
  await dbConnect();
  const link = await PasswordReset.findOne({
    tokenHash: hashToken(token),
    usedAt: { $exists: false },
    expiresAt: { $gt: now },
  }).lean();
  if (!link) {
    throw new DataError('INVALID_RESET_LINK', 'This reset link has expired or has already been used. Ask for a new one.');
  }

  // Claim the link first, so two simultaneous submissions cannot both use it.
  const claimed = await PasswordReset.updateOne(
    { _id: link._id, usedAt: { $exists: false } },
    { $set: { usedAt: now } },
  );
  if (claimed.modifiedCount === 0) {
    throw new DataError('INVALID_RESET_LINK', 'This reset link has expired or has already been used. Ask for a new one.');
  }

  await User.updateOne(
    { _id: link.user },
    { $set: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), passwordChangedAt: now } },
  );
  await PasswordReset.deleteMany({ user: link.user, _id: { $ne: link._id } });
}

/** Whether a reset link is still usable, so the page can say so before the form is filled in. */
export async function isResetLinkValid(token: string, now = new Date()): Promise<boolean> {
  if (!token) return false;
  await dbConnect();
  return !!(await PasswordReset.exists({ tokenHash: hashToken(token), usedAt: { $exists: false }, expiresAt: { $gt: now } }));
}
