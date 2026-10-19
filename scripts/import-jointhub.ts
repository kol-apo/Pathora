/**
 * List JointHub's mentors on Pathora.
 *
 *   npm run import-jointhub                          approved by the first admin
 *   npm run import-jointhub -- --approved-by you@example.com
 *
 * Safe to run more than once. A mentor already imported keeps everything the
 * admin console may since have changed (status, interest profile, hours); only
 * the directory fields (role, country, focus, bio, photo) are refreshed.
 *
 * Each mentor is approved, so they appear on Explore marked as from JointHub,
 * but is not taking bookings until their weekly hours are added. Their account
 * has a placeholder address that cannot receive mail and no password, so
 * nobody can sign in as them until they claim it.
 */
import './env';
import mongoose from 'mongoose';
import dbConnect from '../lib/db/connect';
import { Availability, MentorProfile, User } from '../lib/db/models';
import { initialsFor } from '../lib/db/queries/accounts';
import { PLACEHOLDER_EMAIL_DOMAIN } from '../lib/partners';
import { bioFor, JOINTHUB_MENTORS } from './data/jointhub-mentors';

const slug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Add it to .env.local first.');
    process.exit(1);
  }
  await dbConnect();

  const flag = process.argv.indexOf('--approved-by');
  const approverEmail = flag > -1 ? process.argv[flag + 1]?.trim().toLowerCase() : undefined;
  const approver = approverEmail
    ? await User.findOne({ email: approverEmail, role: 'admin' }).lean()
    : await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }).lean();
  if (!approver) {
    console.error(
      approverEmail
        ? `${approverEmail} is not an admin. Run npm run make-admin -- ${approverEmail} first.`
        : 'No admin account yet. Sign up, then run npm run make-admin -- you@example.com first.',
    );
    process.exit(1);
  }

  let created = 0;
  let refreshed = 0;
  for (const m of JOINTHUB_MENTORS) {
    const email = `${slug(m.name)}@${PLACEHOLDER_EMAIL_DOMAIN}`;
    const user =
      (await User.findOne({ email })) ?? (await User.create({ name: m.name, email, role: 'mentor' }));

    // What the directory says. Refreshed on every run.
    const directory = {
      displayName: m.name,
      initials: initialsFor(m.name),
      role: m.role,
      country: m.country,
      focus: m.focus.slice(0, 2),
      // The directory gives one focus line: shown once, as "What I can help with".
      tags: [],
      helpWith: [...m.focus],
      bio: bioFor(m),
      photo: m.photo,
      source: 'jointhub' as const,
    };

    const existing = await MentorProfile.findOne({ user: user._id });
    if (existing) {
      existing.set(directory);
      await existing.save();
      refreshed++;
      continue;
    }

    const profile = await MentorProfile.create({
      user: user._id,
      ...directory,
      company: '',
      sector: m.sector,
      timezone: m.timezone,
      status: 'approved',
      approvedBy: approver._id,
      approvedAt: new Date(),
      profileVector: m.vector,
      codeOfConductOk: false,
      acceptingBookings: false,
    });
    // An empty week: the mentor (or the admin) adds hours, then turns bookings on.
    await Availability.updateOne(
      { mentor: profile._id },
      { $setOnInsert: { mentor: profile._id, weekly: [] } },
      { upsert: true },
    );
    created++;
  }

  console.log(
    `JointHub: ${created} mentor(s) listed, ${refreshed} refreshed. Approved by ${approver.email}. ` +
      'None take bookings until their hours are added.',
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
