/**
 * Promote an existing account to admin.
 *
 *   npm run make-admin -- you@example.com
 *
 * Admins approve mentors and see research data, so the role can never be
 * chosen at sign-up: the account must exist first (sign up on the site), then
 * someone with access to the database runs this. Sign out and back in after.
 */
import './env';
import mongoose from 'mongoose';
import dbConnect from '../lib/db/connect';
import { User } from '../lib/db/models';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run make-admin -- you@example.com');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Add it to .env.local.');
    process.exit(1);
  }

  await dbConnect();
  const user = await User.findOneAndUpdate({ email }, { $set: { role: 'admin' } }, { returnDocument: 'after' }).lean();
  if (!user) {
    console.error(`No account found for ${email}. Sign up on the site first, then run this again.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`${user.name} <${user.email}> is now an admin. Sign out and back in to pick up the new role.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
