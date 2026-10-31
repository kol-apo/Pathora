/**
 * Runs the browser tests against a throwaway database.
 *
 *   npm run test:e2e                          every browser
 *   npm run test:e2e -- --project="Firefox"   one browser
 *
 * Starts an in-memory MongoDB, fills it with the sample data from
 * scripts/seed.ts, then runs Playwright with the app pointed at it. The real
 * database in .env.local is never used: values set here win over .env.local.
 * Nothing is sent to the AI service, Daily or Resend.
 */
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Run a command and wait for it without blocking this process. (A blocking
 * wait would stop the in-memory database from writing its logs, and it would
 * then stop answering.)
 */
function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function main() {
  const mongo = await MongoMemoryServer.create();
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATHORA_E2E: '1',
    MONGODB_URI: mongo.getUri('pathora_e2e'),
    AUTH_SECRET: randomBytes(32).toString('base64'),
    // `next start` outside Vercel must be told to trust its own address.
    AUTH_TRUST_HOST: 'true',
    AI_PROVIDER: 'mock',
    AI_API_KEY: '',
    DAILY_API_KEY: '',
    RESEND_API_KEY: '',
    CRON_SECRET: randomBytes(16).toString('hex'),
  };

  try {
    if ((await run('npx', ['tsx', 'scripts/seed.ts'], env)) !== 0) throw new Error('Seeding the test database failed.');

    const quoted = process.argv.slice(2).map((a) => (/\s/.test(a) ? `"${a.replace(/"/g, '')}"` : a));
    process.exitCode = await run('npx', ['playwright', 'test', ...quoted], env);
  } finally {
    await mongo.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
