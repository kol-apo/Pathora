import mongoose from 'mongoose';

/**
 * Cached connection helper.
 *
 * Next.js hot-reloads modules in development, which would otherwise open a new
 * connection pool on every reload until Atlas refuses them. We stash the
 * connection (and the in-flight promise, so concurrent callers share one
 * attempt) on `globalThis`, which survives reloads.
 *
 * Server-only. Never import this — or anything under `lib/db/` — from a client
 * component.
 */

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis._mongooseCache ?? { conn: null, promise: null };
globalThis._mongooseCache = cached;

export default async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.');
    }

    cached.promise = mongoose.connect(uri, {
      // Fail fast instead of buffering queries against a dead connection.
      bufferCommands: false,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Clear the failed promise so the next request retries instead of
    // re-awaiting a permanently rejected one.
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
