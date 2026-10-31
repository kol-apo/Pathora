/**
 * The live database checks, against a throwaway database.
 *
 *   npm run verify:db:local
 *
 * Starts an in-memory MongoDB, seeds it, runs scripts/verify-db.ts against it,
 * then removes it. The database in .env.local is never touched. Use this to
 * show the checks passing without writing anything to the real database.
 */
import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<number> {
  // Not spawnSync: blocking here would stop the in-memory database answering.
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function main() {
  const mongo = await MongoMemoryServer.create();
  const env = { ...process.env, MONGODB_URI: mongo.getUri('pathora_verify'), DAILY_API_KEY: '' };
  try {
    console.log('Throwaway database started. Seeding it...\n');
    if ((await run('npx', ['tsx', 'scripts/seed.ts'], env)) !== 0) throw new Error('Seeding failed.');
    console.log('\nRunning the live database checks...\n');
    process.exitCode = await run('npx', ['tsx', 'scripts/verify-db.ts'], env);
  } finally {
    await mongo.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
