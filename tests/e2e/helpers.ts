import { test as base, expect, type Page } from '@playwright/test';
import { MongoClient, type Db, type ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

/**
 * Shared pieces for the browser tests: a handle on the throwaway database (to
 * set up accounts quickly), signing in, and a check that no page threw an error.
 */

export const PASSWORD = 'pathora-e2e-1';

let client: MongoClient | null = null;
export async function db(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (process.env.PATHORA_E2E !== '1' || !uri) throw new Error('Run with `npm run test:e2e`.');
  client ??= await MongoClient.connect(uri);
  return client.db();
}

/** A tag unique to this test in this browser, for emails and names. */
export function tag(testInfo: { project: { name: string } }): string {
  return `${testInfo.project.name.replace(/\W+/g, '').toLowerCase()}${Date.now()}`;
}

const now = () => new Date();
let hash: string | null = null;
const passwordHash = async () => (hash ??= await bcrypt.hash(PASSWORD, 4));

/** A student who has already agreed to the research consent. */
export async function createStudent(name: string, email: string) {
  const d = await db();
  const user = (
    await d.collection('users').insertOne({ name, email, role: 'student', passwordHash: await passwordHash(), createdAt: now(), updatedAt: now() })
  ).insertedId;
  const participantCode = `E-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  await d.collection('studentprofiles').insertOne({
    user,
    initials: name.split(' ').map((p) => p[0]).join('').slice(0, 3).toUpperCase(),
    participantCode,
    consentVersion: 'e2e',
    consentedAt: now(),
    savedMentors: [],
    savedOpportunities: [],
    createdAt: now(),
    updatedAt: now(),
  });
  return { id: user, email, participantCode };
}

/**
 * An approved mentor in Lagos time. `hours` are open every day (minutes from
 * midnight); `noticeHours` is the minimum notice.
 */
export async function createMentor(
  name: string,
  email: string,
  opts: { hours?: { startMinute: number; endMinute: number }[]; noticeHours?: number } = {},
) {
  const d = await db();
  const admin = await d.collection('users').findOne({ role: 'admin' });
  const user = (
    await d.collection('users').insertOne({ name, email, role: 'mentor', passwordHash: await passwordHash(), createdAt: now(), updatedAt: now() })
  ).insertedId;
  const mentor = (
    await d.collection('mentorprofiles').insertOne({
      user,
      displayName: name,
      initials: name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
      role: 'Data Analyst',
      company: 'Test Company',
      sector: 'Technology',
      country: 'Nigeria',
      timezone: 'Africa/Lagos',
      experience: 4,
      bio: 'A mentor created by the browser tests.',
      focus: [],
      tags: [],
      helpWith: [],
      socials: {},
      links: [],
      codeOfConductOk: true,
      status: 'approved',
      vetted: true,
      approvedBy: admin?._id,
      approvedAt: now(),
      acceptingBookings: true,
      ratingAvg: 0,
      ratingCount: 0,
      sessionCount: 0,
      createdAt: now(),
      updatedAt: now(),
    })
  ).insertedId;
  const hours = opts.hours ?? [];
  await d.collection('availabilities').insertOne({
    mentor,
    weekly: [0, 1, 2, 3, 4, 5, 6].flatMap((dayOfWeek) => hours.map((h) => ({ dayOfWeek, ...h }))),
    exceptions: [],
    sessionMinutes: 45,
    bufferMinutes: 15,
    leadTimeHours: opts.noticeHours ?? 24,
    horizonDays: 30,
    createdAt: now(),
    updatedAt: now(),
  });
  return { id: mentor, userId: user, email };
}

/** Insert a booking directly, for sessions in the past. */
export async function createBooking(
  student: ObjectId,
  mentor: ObjectId,
  hoursFromNow: number,
  status: 'pending' | 'confirmed' | 'completed' | 'no_show' | 'cancelled',
) {
  const startsAt = new Date(Date.now() + hoursFromNow * 3_600_000);
  return (
    await (await db()).collection('bookings').insertOne({
      student,
      mentor,
      topic: 'Getting my first data job',
      startsAt,
      endsAt: new Date(startsAt.getTime() + 45 * 60_000),
      status,
      active: status !== 'cancelled',
      viaBridge: false,
      notes: [],
      createdAt: now(),
      updatedAt: now(),
    })
  ).insertedId;
}

export async function signIn(page: Page, email: string, home: RegExp) {
  await page.goto('/signin');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(home);
}

/** True when the page is wider than the screen (sideways scrolling). */
export const scrollsSideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

/**
 * `test` with one addition: every test fails if any page threw an uncaught
 * error while it ran.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => {
        // WebKit reports a background page preload (Next.js fetches linked pages
        // ahead of time, `?_rsc=`) as an error when the test moves to another
        // page before it finishes. The preload is simply cancelled; nothing on
        // the page is affected. Every other error still fails the test.
        if (/\?_rsc=.*due to access control checks/.test(e.message)) return;
        errors.push(e.message);
      });
      await use(errors);
      expect(errors, 'uncaught errors in the page').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
