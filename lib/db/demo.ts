import { currentStudent } from '@/lib/data';
import dbConnect from './connect';
import { User } from './models';

/**
 * The seeded demo student, standing in for a signed-in user until Auth.js lands.
 *
 * Shared by `scripts/seed.ts` (which creates the account) and the bookings API
 * (which books as it), so the two can never disagree about which account that is.
 */

export const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, '.')
    .replace(/^\.|\.$/g, '');

export const DEMO_STUDENT_EMAIL = `${slug(currentStudent.name)}@pathora.test`;

/**
 * The demo student's user id, or null when it is not available.
 *
 * Always null in production: a deployed app must never let an anonymous visitor
 * book as somebody. Delete this function when real sessions exist.
 */
export async function getDemoStudentId(): Promise<string | null> {
  if (process.env.NODE_ENV === 'production') return null;
  await dbConnect();
  const user = await User.findOne({ email: DEMO_STUDENT_EMAIL, role: 'student' })
    .select('_id')
    .lean();
  return user ? String(user._id) : null;
}
