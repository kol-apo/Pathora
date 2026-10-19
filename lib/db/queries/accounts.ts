import bcrypt from 'bcryptjs';
import dbConnect from '../connect';
import { StudentProfile, User } from '../models';
import type { UserRole } from '../models/User';
import { DataError, isDuplicateKeyError } from './errors';
import { generateParticipantCode } from '@/lib/research/participant';

/**
 * Accounts: registration, password checks and Google sign-in.
 *
 * Public sign-up only ever creates students. Mentors join through an
 * application, and admins are promoted with `npm run make-admin`, so no one
 * can give themselves a privileged role from the sign-up page.
 */

/** Cost factor for bcrypt. 12 is a sensible default for interactive logins. */
const BCRYPT_ROUNDS = 12;

export interface AccountIdentity {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const normaliseEmail = (email: string) => email.trim().toLowerCase();

let cachedDummyHash: Promise<string> | null = null;
/** A genuine bcrypt hash of a random value, made once, for constant-time misses. */
function dummyHash(): Promise<string> {
  cachedDummyHash ??= bcrypt.hash(Math.random().toString(36), BCRYPT_ROUNDS);
  return cachedDummyHash;
}

/** "Amara Okafor" -> "AO"; one word -> its first two letters. */
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

const toIdentity = (u: { _id: unknown; name: string; email: string; role: UserRole }): AccountIdentity => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
});

/** Create a student account with a password, plus their empty student profile. */
export async function registerStudent(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AccountIdentity> {
  await dbConnect();
  const email = normaliseEmail(input.email);

  if (await User.exists({ email })) {
    throw new DataError('EMAIL_TAKEN', 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    const user = await User.create({
      name: input.name.trim(),
      email,
      passwordHash,
      role: 'student',
    });
    await StudentProfile.create({ user: user._id, initials: initialsFor(user.name) });
    return toIdentity(user);
  } catch (err) {
    // Two sign-ups for the same email at once: the unique index decides.
    if (isDuplicateKeyError(err)) {
      throw new DataError('EMAIL_TAKEN', 'An account with this email already exists.');
    }
    throw err;
  }
}

/**
 * Check an email and password. Returns the account, or null for a wrong email
 * or password; the caller cannot tell which, so emails cannot be probed.
 */
export async function verifyCredentials(email: string, password: string): Promise<AccountIdentity | null> {
  await dbConnect();
  const user = await User.findOne({ email: normaliseEmail(email) }).select('+passwordHash').lean();

  // Compare against a real hash even when the user is missing, so the
  // response takes the same time whether or not the email exists.
  const hash = user?.passwordHash ?? (await dummyHash());
  const ok = await bcrypt.compare(password, hash);
  return user && user.passwordHash && ok ? toIdentity(user) : null;
}

/**
 * Find or create the account for a Google sign-in.
 *
 * Email addresses are not verified at password sign-up, so an existing
 * password account with this email might have been created by someone else.
 * Linking Google to it would let that person keep access to the account, so
 * Google sign-in refuses (ACCOUNT_EXISTS) instead. Accounts with no password,
 * such as seeded ones, are linked.
 */
export async function upsertGoogleUser(profile: {
  googleId: string;
  email: string;
  name: string;
  image?: string;
}): Promise<AccountIdentity> {
  await dbConnect();
  const email = normaliseEmail(profile.email);

  const linked = await User.findOne({ googleId: profile.googleId }).lean();
  if (linked) return toIdentity(linked);

  const existing = await User.findOne({ email }).select('+passwordHash').lean();
  if (existing) {
    if (existing.passwordHash) {
      throw new DataError(
        'ACCOUNT_EXISTS',
        'An account with this email already uses a password. Sign in with your password.',
      );
    }
    await User.updateOne(
      { _id: existing._id },
      { $set: { googleId: profile.googleId, emailVerified: existing.emailVerified ?? new Date() } },
    );
    return toIdentity(existing);
  }

  const user = await User.create({
    name: profile.name.trim() || email.split('@')[0],
    email,
    googleId: profile.googleId,
    image: profile.image,
    // Google has verified this address.
    emailVerified: new Date(),
    role: 'student',
  });
  await StudentProfile.create({ user: user._id, initials: initialsFor(user.name) });
  return toIdentity(user);
}

/**
 * What every request re-checks: the current role (it can change), and when
 * the password last changed, which ends sessions signed in before it.
 */
export async function getSessionState(
  userId: string,
): Promise<{ role: UserRole; passwordChangedAt: Date | null } | null> {
  await dbConnect();
  const user = await User.findById(userId).select('role passwordChangedAt').lean();
  return user ? { role: user.role, passwordChangedAt: user.passwordChangedAt ?? null } : null;
}

/** The current role for a user id. Roles can change (make-admin), so read it fresh. */
export async function getRole(userId: string): Promise<UserRole | null> {
  await dbConnect();
  const user = await User.findById(userId).select('role').lean();
  return user?.role ?? null;
}

export interface StudentStatus {
  consented: boolean;
  participantCode?: string;
  consentVersion?: string;
}

/** Whether a student has given research consent yet. */
export async function getStudentStatus(userId: string): Promise<StudentStatus> {
  await dbConnect();
  const profile = await StudentProfile.findOne({ user: userId })
    .select('consentedAt consentVersion participantCode')
    .lean();
  return {
    consented: !!profile?.consentedAt,
    participantCode: profile?.participantCode,
    consentVersion: profile?.consentVersion,
  };
}

/**
 * Record a student's research consent and give them a participant code.
 * Safe to call twice: an existing code is kept.
 */
export async function recordConsent(userId: string, consentVersion: string): Promise<StudentStatus> {
  await dbConnect();
  const user = await User.findById(userId).select('role name').lean();
  if (!user || user.role !== 'student') {
    throw new DataError('NOT_A_STUDENT', 'Only students give research consent.');
  }

  // Older accounts may not have a profile yet.
  await StudentProfile.updateOne(
    { user: userId },
    { $setOnInsert: { user: userId, initials: initialsFor(user.name) } },
    { upsert: true },
  );

  // A collision between random codes is unlikely but possible; the unique
  // index catches it and we draw again.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const profile = await StudentProfile.findOneAndUpdate(
        { user: userId },
        [
          {
            $set: {
              consentVersion,
              consentedAt: '$$NOW',
              participantCode: { $ifNull: ['$participantCode', generateParticipantCode()] },
            },
          },
        ],
        { returnDocument: 'after', updatePipeline: true },
      ).lean();
      return {
        consented: true,
        participantCode: profile?.participantCode,
        consentVersion: profile?.consentVersion,
      };
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
    }
  }
  throw new Error('Could not allocate a unique participant code.');
}
