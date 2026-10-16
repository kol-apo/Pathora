/**
 * Seed MongoDB from the mock data in lib/data.ts.
 *
 *   npm run seed           # upsert; leaves existing data alone
 *   npm run seed -- --fresh   # drop the collections first
 *
 * Requires MONGODB_URI. Safe to re-run.
 */
import './env';
import mongoose from 'mongoose';
import dbConnect from '../lib/db/connect';
import {
  AnalyticsEvent,
  Availability,
  Booking,
  BridgeRecommendation,
  DiscoveryResult,
  MentorProfile,
  Opportunity,
  StudentProfile,
  User,
  VerifiedResource,
  VideoSession,
} from '../lib/db/models';
import catalogue from '../lib/research/verified-resources.json';
import { consultants, currentStudent, opportunities } from '../lib/data';
import { DEMO_STUDENT_EMAIL, slug } from '../lib/db/demo';

const fresh = process.argv.includes('--fresh');

/**
 * Each sample mentor's position on the five interest axes (prompts/discovery.json
 * vector_space): technical, analytical, commercial, expressive, facilitative.
 * In production these are set by an admin at approval time.
 */
const PROFILE_VECTORS: Record<string, number[]> = {
  'Taiwo Adeyemi': [0.72, 0.5, 0.62, 0.3, 0.6],
  'Chidi Eze': [0.92, 0.58, 0.22, 0.12, 0.25],
  'Wanjiru Kamau': [0.85, 0.82, 0.3, 0.15, 0.3],
  'Nkechi Okafor': [0.45, 0.9, 0.58, 0.1, 0.22],
  'Fatima Al-Hassan': [0.35, 0.85, 0.5, 0.12, 0.55],
  'Kwame Asante': [0.4, 0.92, 0.45, 0.08, 0.3],
  'Amara Diallo': [0.25, 0.35, 0.88, 0.55, 0.62],
  'Tunde Bakare': [0.45, 0.42, 0.95, 0.2, 0.5],
  'Ifeoma Nwosu': [0.35, 0.5, 0.92, 0.25, 0.45],
  'Zainab Mensah': [0.25, 0.25, 0.48, 0.92, 0.55],
  'David Okoro': [0.38, 0.18, 0.35, 0.95, 0.4],
  'Thandiwe Dlamini': [0.6, 0.35, 0.3, 0.88, 0.5],
};

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
      BridgeRecommendation.deleteMany({}),
      VerifiedResource.deleteMany({}),
      AnalyticsEvent.deleteMany({}),
      VideoSession.deleteMany({}),
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
    BridgeRecommendation.syncIndexes(),
    VerifiedResource.syncIndexes(),
    AnalyticsEvent.syncIndexes(),
    VideoSession.syncIndexes(),
  ]);
  console.log('indexes synced');

  // ── Admin ─────────────────────────────────────────────────────────────────
  // Every approval must name an admin, so the seed creates one to approve the
  // sample mentors.
  const admin = await User.findOneAndUpdate(
    { email: 'admin@pathora.test' },
    { $set: { name: 'Pathora Admin', role: 'admin', emailVerified: new Date() } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  console.log('seeded admin admin@pathora.test');

  // ── Mentors ───────────────────────────────────────────────────────────────
  let mentorCount = 0;
  for (const c of consultants) {
    const email = `${slug(c.name)}@pathora.test`;

    const user = await User.findOneAndUpdate(
      { email },
      { $set: { name: c.name, role: 'mentor', emailVerified: new Date() } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
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
          country: 'Nigeria',
          // vetted is derived from status by the model.
          status: 'approved',
          approvedBy: admin._id,
          approvedAt: new Date(),
          codeOfConductOk: true,
          profileVector: PROFILE_VECTORS[c.name],
          acceptingBookings: true,
          ratingAvg: c.rating,
          ratingCount: Math.max(1, Math.round(c.sessions * 0.6)),
          sessionCount: c.sessions,
        },
        // Fields from the earlier vetting model, no longer used.
        $unset: { vettedAt: '', vettedBy: '' },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
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
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );

    mentorCount++;
  }
  console.log(`seeded ${mentorCount} mentors with availability`);

  // ── Student ───────────────────────────────────────────────────────────────
  const studentEmail = DEMO_STUDENT_EMAIL;
  const studentUser = await User.findOneAndUpdate(
    { email: studentEmail },
    { $set: { name: currentStudent.name, role: 'student', emailVerified: new Date() } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
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
        country: 'Nigeria',
        // Demo pseudonym. Real participants get theirs when they consent.
        participantCode: 'P-DEMO-001',
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
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
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  }
  console.log(`seeded ${opportunities.length} opportunities`);

  // ── Verified resources (the prompt allow-list) ────────────────────────────
  for (const r of catalogue.resources) {
    await VerifiedResource.findOneAndUpdate(
      { name: r.name },
      {
        $set: {
          organisation: r.organisation,
          sector: r.sector,
          type: r.type,
          countries: r.countries,
          url: r.url,
          isActive: true,
        },
        $setOnInsert: { verifiedAt: new Date() },
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    );
  }
  console.log(`seeded ${catalogue.resources.length} verified resources`);

  await mongoose.disconnect();
  console.log('\ndone');
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
