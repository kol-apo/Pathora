/**
 * Live database verification.
 *
 *   npm run verify:db
 *
 * Skips cleanly when MONGODB_URI is unset — `npm run verify` covers everything
 * that can be checked offline. This file exists for the things that cannot be:
 * that the unique index is physically present, and that it actually stops two
 * concurrent bookings from taking the same slot.
 *
 * Creates its own throwaway records under a run-scoped marker and removes them
 * at the end, so it is safe to run against a seeded database.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import dbConnect from '../lib/db/connect';
import { Availability, Booking, MentorProfile, User } from '../lib/db/models';
import { createBooking } from '../lib/db/queries/bookings';
import { listAvailableSlots } from '../lib/db/queries/mentors';
import { DataError } from '../lib/db/queries/errors';

let passed = 0;
let failed = 0;

function ok(label: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
  }
}

const RUN = `verify-${Date.now()}`;

async function main() {
  if (!process.env.MONGODB_URI) {
    console.log('MONGODB_URI not set — skipping live database checks.');
    console.log('Set it in .env.local to run them.');
    process.exit(0);
  }

  await dbConnect();
  console.log(`connected (run marker: ${RUN})\n`);

  // Ensure indexes exist before testing behaviour that depends on them.
  await Booking.syncIndexes();

  console.log('── Index presence ─────────────────────────────────────────');
  const indexes = await Booking.collection.indexes();
  const slotIdx = indexes.find((i) => i.name === 'one_active_booking_per_slot');
  ok('slot index exists in MongoDB', !!slotIdx);
  ok('slot index is unique', slotIdx?.unique === true);
  ok(
    'slot index is partial on active:true',
    JSON.stringify(slotIdx?.partialFilterExpression) === '{"active":true}',
  );

  // ── Fixtures ──────────────────────────────────────────────────────────────
  const mentorUser = await User.create({
    name: `Test Mentor ${RUN}`,
    email: `mentor.${RUN}@pathora.test`,
    role: 'mentor',
  });
  const mentor = await MentorProfile.create({
    user: mentorUser._id,
    displayName: `Test Mentor ${RUN}`,
    initials: 'TM',
    role: 'Tester',
    company: 'Pathora',
    sector: 'Technology',
    experience: 5,
    bio: 'Fixture.',
    timezone: 'Africa/Lagos',
    vetted: true,
  });
  await Availability.create({
    mentor: mentor._id,
    weekly: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
      dayOfWeek,
      startMinute: 9 * 60,
      endMinute: 17 * 60,
    })),
    sessionMinutes: 45,
    bufferMinutes: 15,
    leadTimeHours: 24,
    horizonDays: 30,
  });

  const students = await User.create(
    Array.from({ length: 5 }, (_, i) => ({
      name: `Test Student ${i}`,
      email: `student.${i}.${RUN}@pathora.test`,
      role: 'student' as const,
    })),
  );

  const cleanup = async () => {
    await Booking.deleteMany({ mentor: mentor._id });
    await Availability.deleteMany({ mentor: mentor._id });
    await MentorProfile.deleteMany({ _id: mentor._id });
    await User.deleteMany({ email: { $regex: RUN } });
  };

  try {
    console.log('\n── Slot generation against live data ──────────────────────');
    const slots = await listAvailableSlots(String(mentor._id));
    ok('mentor has bookable slots', slots.length > 0, `got ${slots.length}`);
    if (slots.length === 0) throw new Error('no slots to test against');

    const target = new Date(slots[0].startsAt);

    console.log('\n── Concurrent booking of one slot ─────────────────────────');
    // The real test: five students hit the same slot simultaneously.
    const results = await Promise.allSettled(
      students.map((s) =>
        createBooking({
          studentId: String(s._id),
          mentorId: String(mentor._id),
          startsAt: target,
          topic: 'Concurrency test',
        }),
      ),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    ok(
      'exactly one concurrent booking succeeded',
      fulfilled.length === 1,
      `${fulfilled.length} succeeded, ${rejected.length} rejected`,
    );
    ok(
      'the rest failed with a slot conflict, not a crash',
      rejected.every(
        (r) =>
          r.reason instanceof DataError &&
          (r.reason.code === 'SLOT_TAKEN' || r.reason.code === 'SLOT_UNAVAILABLE'),
      ),
      rejected.map((r) => String(r.reason?.code ?? r.reason)).join(', '),
    );

    const stored = await Booking.countDocuments({ mentor: mentor._id, active: true });
    ok('exactly one active booking persisted', stored === 1, `found ${stored}`);

    console.log('\n── Cancellation frees the slot ────────────────────────────');
    const booking = await Booking.findOne({ mentor: mentor._id, active: true });
    booking!.status = 'cancelled';
    await booking!.save();
    ok('cancelled booking is inactive', booking!.active === false);

    const rebooked = await createBooking({
      studentId: String(students[1]._id),
      mentorId: String(mentor._id),
      startsAt: target,
      topic: 'Rebooking after cancellation',
    });
    ok('the freed slot can be rebooked', !!rebooked.id);
    ok(
      'both bookings coexist, only one active',
      (await Booking.countDocuments({ mentor: mentor._id })) === 2 &&
        (await Booking.countDocuments({ mentor: mentor._id, active: true })) === 1,
    );

    console.log('\n── A taken slot disappears from availability ──────────────');
    const after = await listAvailableSlots(String(mentor._id));
    ok(
      'the booked slot is no longer offered',
      !after.some((s) => s.startsAt === target.toISOString()),
    );

    console.log('\n── Out-of-hours booking is refused ────────────────────────');
    const threeAm = new Date(target);
    threeAm.setUTCHours(2, 0, 0, 0);
    try {
      await createBooking({
        studentId: String(students[2]._id),
        mentorId: String(mentor._id),
        startsAt: threeAm,
        topic: 'Should not work',
      });
      ok('booking outside working hours refused', false, 'it succeeded');
    } catch (err) {
      ok(
        'booking outside working hours refused',
        err instanceof DataError && err.code === 'SLOT_UNAVAILABLE',
      );
    }
  } finally {
    await cleanup();
    console.log('\ncleaned up fixtures');
  }

  await mongoose.disconnect();
  console.log(`\n${'='.repeat(58)}`);
  console.log(failed === 0 ? `ALL ${passed} LIVE CHECKS PASSED` : `${passed} passed, ${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
