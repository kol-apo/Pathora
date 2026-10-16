/**
 * Research reports, printed from the live database.
 *
 *   npm run report
 *
 * The MongoDB equivalents of the study's three measures: bridge conversion
 * per sector (the primary dependent variable), prompt output validity per
 * prompt version, and session completion. Read-only.
 */
import './env';
import mongoose from 'mongoose';
import { bridgeFunnel, schemaValidation, sessionCompletion } from '../lib/db/queries/research';

const pad = (v: unknown, n: number) => String(v).padStart(n);

async function main() {
  if (!process.env.MONGODB_URI) {
    console.log('MONGODB_URI is not set. Add it to .env.local.');
    process.exit(1);
  }

  console.log('\nBridge funnel (primary dependent variable)');
  const funnel = await bridgeFunnel();
  if (funnel.length === 0) console.log('  no discovery results yet');
  else {
    console.log(`  ${'sector'.padEnd(18)}${pad('results', 9)}${pad('viewed', 8)}${pad('booked', 8)}${pad('conversion', 12)}`);
    for (const r of funnel) {
      console.log(
        `  ${r.sector.padEnd(18)}${pad(r.resultsGenerated, 9)}${pad(r.resultsViewed, 8)}${pad(r.resultsBooked, 8)}${pad(`${r.bridgeConversionPct}%`, 12)}`,
      );
    }
  }

  console.log('\nOutput validity by prompt version');
  const validity = await schemaValidation();
  if (validity.length === 0) console.log('  no discovery results yet');
  for (const v of validity) {
    console.log(
      `  ${v.promptVersion}: ${v.results} results, ${v.validityPct}% valid, ${v.firstAttemptPct}% valid first time, ${v.meanRetries} mean retries (models: ${v.models.join(', ')})`,
    );
  }

  console.log('\nSession completion');
  const s = await sessionCompletion();
  console.log(
    s.sessions === 0
      ? '  no video sessions yet'
      : `  ${s.sessionsEnded} of ${s.sessions} sessions ended (${s.completionPct}%), median ${s.medianDurationSeconds ?? '-'} seconds`,
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
