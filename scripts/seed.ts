/**
 * Seed MongoDB from the mock data in lib/data.ts.
 *
 *   npm run seed           # upsert; leaves existing data alone
 *   npm run seed -- --fresh   # drop the collections first
 *
 * Requires MONGODB_URI. Safe to re-run.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import dbConnect from '../lib/db/connect';
import {
  Availability,
  Booking,
  DiscoveryResult,
  MentorProfile,
  Opportunity,
  StudentProfile,
  User,
} from '../lib/db/models';
import { consultants, currentStudent, opportunities } from '../lib/data';
import { DEMO_STUDENT_EMAIL, slug } from '../lib/db/demo';

const fresh = process.argv.includes('--fresh');

/** "14 Sep" -> a Date this year, rolled to next year if already past. */
function parseDeadline(text: string): Date | null {
  if (!text || text.toLowerCase() === 'rolling') return null;
  const [dayStr, monStr] = text.split(' ');
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const month = months.indexOf((monStr ?? '').slice(0, 3).toLowerCase());
  const day = Number(dayStr);
  if (month < 0 || !Number.isFinite(day)) return null;

  const now = new Date();
  let date = new Date(Date.UTC(now.getUTCFullYear(), month, day, 23, 59, 0));
  if (date < now) date = new Date(Date.UTC(now.getUTCFullYear() + 1, month, day, 23, 59, 0));
  return date;
}

/** Mon/Wed/Fri, 09:00–12:00 and 14:00–17:00, in the mentor's own timezone. */
const WEEKLY = [1, 3, 5].flatMap((dayOfWeek) => [
  { dayOfWeek, startMinute: 9 * 60, endMinute: 12 * 60 },
  { dayOfWeek, startMinute: 14 * 60, endMinute: 17 * 60 },
]);

/**
 * "Next slot in 2 weeks" is reproduced through the real mechanism — lead time —
 * rather than a display string, so the slot generator genuinely returns nothing
 * sooner than that.
 */
function leadTimeFor(nextSlot: string | null): number {
  if (!nextSlot) return 24;
  const days = Number(/(\d+)/.exec(nextSlot)?.[1] ?? 0);
  if (/week/i.test(nextSlot)) return days * 7 * 24;
  return days * 24;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.');
    process.exit(1);
  }

  await dbConnect();
  console.log('connected');

  if (fresh) {
    await Promise.all([
      User.deleteMany({}),
      MentorProfile.deleteMany({}),
      StudentProfile.deleteMany({}),
      Availability.deleteMany({}),
      Booking.deleteMany({}),
      Opportunity.deleteMany({}),
      DiscoveryResult.deleteMany({}),
    ]);
    console.log('cleared collections');
  }

  /**
   * Build the indexes declared on the schemas.
   *
   * This is not optional housekeeping. The partial unique index on
   * { mentor, startsAt } is the double-booking guarantee — if it is not
   * physically present in MongoDB, concurrent bookings will both succeed and
   * nothing will complain. Mongoose autoIndex is unreliable in production, so
   * it is done explicitly here.
   */
  await Promise.all([
    User.syncIndexes(),
    MentorProfile.syncIndexes(),
    StudentProfile.syncIndexes(),
    Availability.syncIndexes(),
    Booking.syncIndexes(),
    Opportunity.syncIndexes(),
    DiscoveryResult.syncIndexes(),
  ]);
  console.log('indexes synced');

  // ── Mentors ───────────────────────────────────────────────────────────────
  let mentorCount = 0;
  for (const c of consultants) {
    const email = `${slug(c.name)}@pathora.test`;

    const user = await User.findOneAndUpdate(
      { email },
      { $set: { name: c.name, role: 'mentor', emailVerified: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const mentor = await MentorProfile.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          displayName: c.name,
          initials: c.initials,
          role: c.role,
          company: c.company,
          sector: c.sector,
          experience: c.experience,
          focus: c.focus,
          tags: c.tags,
          bio: c.bio,
          helpWith: c.helpWith,
          timezone: 'Africa/Lagos',
          vetted: true,
          vettedAt: new Date(),
          acceptingBookings: true,
          ratingAvg: c.rating,
          ratingCount: Math.max(1, Math.round(c.sessions * 0.6)),
          sessionCount: c.sessions,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await Availability.findOneAndUpdate(
      { mentor: mentor._id },
      {
        $set: {
          weekly: WEEKLY,
          exceptions: [],
          sessionMinutes: 45,
          bufferMinutes: 15,
          leadTimeHours: leadTimeFor(c.nextSlot),
          horizonDays: 60,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    mentorCount++;
  }
  console.log(`seeded ${mentorCount} mentors with availability`);

  // ── Student ───────────────────────────────────────────────────────────────
  const studentEmail = DEMO_STUDENT_EMAIL;
  const studentUser = await User.findOneAndUpdate(
    { email: studentEmail },
    { $set: { name: currentStudent.name, role: 'student', emailVerified: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await StudentProfile.findOneAndUpdate(
    { user: studentUser._id },
    {
      $set: {
        initials: currentStudent.initials,
        university: currentStudent.university,
        field: currentStudent.field,
        year: currentStudent.year,
        careerMatch: currentStudent.careerMatch,
        matchedSector: currentStudent.matchedSector,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log(`seeded student ${studentEmail}`);

  // ── Opportunities ─────────────────────────────────────────────────────────
  for (const o of opportunities) {
    await Opportunity.findOneAndUpdate(
      { title: o.title },
      {
        $set: {
          organisation: o.organisation,
          type: o.type,
          sector: o.sector,
          description: o.description,
          url: o.url,
          deadline: parseDeadline(o.deadline),
          published: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  console.log(`seeded ${opportunities.length} opportunities`);

  await mongoose.disconnect();
  console.log('\ndone');
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
