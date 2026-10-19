/**
 * Read the opportunity feeds and store what is new.
 *
 *   npm run fetch-opportunities
 *
 * Safe to run as often as you like: listings are matched by their link, so
 * nothing is stored twice. Once deployed, /api/cron/opportunities does the
 * same on a schedule.
 */
import './env';
import mongoose from 'mongoose';
import { refreshOpportunities, listOpportunities } from '../lib/db/queries/opportunities';
import { SOURCES } from '../lib/opportunities/sources';

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Add it to .env.local first.');
    process.exit(1);
  }
  const reports = await refreshOpportunities();
  for (const r of reports) {
    const name = SOURCES[r.source].name.padEnd(28);
    console.log(
      r.error
        ? `${name} failed: ${r.error}`
        : `${name} ${r.read} read, ${r.saved} saved, ${r.skippedClosed} already closed`,
    );
  }
  console.log(`${(await listOpportunities()).length} open opportunities listed.`);
  await mongoose.disconnect();
  process.exit(reports.every((r) => r.error) ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
