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
  PasswordReset,
  StudentProfile,
  VideoSession,
  User,
} from '../lib/db/models';
import { cancelBookingForStudent, createBooking } from '../lib/db/queries/bookings';
import { requestPasswordReset, resetPassword } from '../lib/db/queries/passwords';
import { deleteAccount } from '../lib/db/queries/accountDeletion';
import { joinVideoSession, syncVideoSession } from '../lib/db/queries/video';
import { getSessionState, verifyCredentials } from '../lib/db/queries/accounts';
import bcrypt from 'bcryptjs';
import { previewBridge, saveDiscoveryResult } from '../lib/db/queries/discovery';
import { generateDiscovery } from '../lib/ai/discovery';
import { studentVectorFor } from '../lib/discovery/questions';
import { listAvailableSlots } from '../lib/db/queries/mentors';
import { bridgeEligible, surfaceBridgeConsultants } from '../lib/db/queries/bridge';
import { getDiscoveryResultForMentor, getDiscoveryResultForStudent } from '../lib/db/queries/access';
import { bridgeFunnel, countStudentEvents, logEvent, logStudentEvent, sessionCompletion } from '../lib/db/queries/research';
import {
  getMyAvailability,
  listMyPastSessions,
  respondToBooking,
  updateMyAvailability,
} from '../lib/db/queries/mentorConsole';
import { addDays, formatZonedDate } from '../lib/booking/timezone';
import { rateSession } from '../lib/db/queries/feedback';
import { feedbackSummary, listParticipants, listSessionsForAdmin } from '../lib/db/queries/adminInsights';
import { addOpportunity, hideOpportunity, listOpportunities, refreshOpportunities } from '../lib/db/queries/opportunities';
import { BRIDGE_SIZE, rankCandidates } from '../lib/matching/similarity';
import { SECTORS } from '../lib/types';
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
  await BridgeRecommendation.syncIndexes();

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
  const adminUser = await User.create({
    name: `Test Admin ${RUN}`,
    email: `admin.${RUN}@pathora.test`,
    role: 'admin',
  });
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
    status: 'approved',
    approvedBy: adminUser._id,
    approvedAt: new Date(),
    profileVector: [0.9, 0.6, 0.2, 0.1, 0.3],
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

  const studentIds = students.map((s) => s._id);
  let resultId: string | null = null;
  let savedResultId: string | null = null;

  const cleanup = async () => {
    if (resultId) {
      await BridgeRecommendation.deleteMany({ discoveryResult: resultId });
      await DiscoveryResult.deleteMany({ _id: resultId });
    }
    if (savedResultId) {
      await BridgeRecommendation.deleteMany({ discoveryResult: savedResultId });
      await DiscoveryResult.deleteMany({ _id: savedResultId });
    }
    await StudentProfile.deleteMany({ user: { $in: studentIds } });
    const runUsers = await User.find({ email: { $regex: RUN } }).select('_id').lean();
    await PasswordReset.deleteMany({ user: { $in: runUsers.map((u) => u._id) } });
    await AnalyticsEvent.deleteMany({ participantCode: RUN });
    await Booking.deleteMany({ student: { $in: studentIds } });
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

    console.log('\n── Overlapping quarter-hour starts ────────────────────────');
    {
      // Sessions can start every 15 minutes, so a clash need not share a start time.
      await Booking.syncIndexes();
      const overlapIdx = (await Booking.collection.indexes()).find((i) => i.name === 'no_overlapping_active_bookings');
      ok('the overlap index exists, unique and partial on active bookings', overlapIdx?.unique === true && !!overlapIdx.partialFilterExpression);

      const open = await listAvailableSlots(String(mentor._id));
      const startSet = new Set(open.map((sl) => sl.startsAt));
      const first = open.find((sl) =>
        [15, 30, 45].every((m) => startSet.has(new Date(Date.parse(sl.startsAt) + m * 60_000).toISOString())),
      );
      ok('a mentor offers starts 15 minutes apart', !!first);
      const starts = [0, 15, 30, 45].map((m) => new Date(Date.parse(first!.startsAt) + m * 60_000));

      // Four students try four different, overlapping start times at the same instant.
      const raced = await Promise.allSettled(
        starts.map((startsAt, i) =>
          createBooking({ studentId: String(students[i]._id), mentorId: String(mentor._id), startsAt, topic: 'Overlap race' }),
        ),
      );
      const won = raced.filter((r) => r.status === 'fulfilled');
      ok('exactly one of four overlapping bookings succeeded', won.length === 1, `${won.length} succeeded`);
      ok(
        'the others were refused cleanly',
        raced.every(
          (r) =>
            r.status === 'fulfilled' ||
            (r.reason instanceof DataError && ['SLOT_TAKEN', 'SLOT_UNAVAILABLE'].includes(r.reason.code)),
        ),
      );

      // The database alone, with the code's own check skipped: still refused.
      let refusedByDb = false;
      try {
        await Booking.create({
          student: students[4]._id,
          mentor: mentor._id,
          topic: 'Straight to the database',
          startsAt: new Date(starts[0].getTime() + 30 * 60_000),
          endsAt: new Date(starts[0].getTime() + 75 * 60_000),
          status: 'pending',
        });
      } catch (err) {
        refusedByDb = (err as { code?: number }).code === 11000;
      }
      ok('the database itself refuses an overlapping booking at a different start time', refusedByDb);

      const after = new Set((await listAvailableSlots(String(mentor._id))).map((sl) => sl.startsAt));
      const winner = (won[0] as PromiseFulfilledResult<{ startsAt: string }>).value.startsAt;
      const wt = Date.parse(winner);
      ok(
        'starts that overlap the booking or its break are no longer offered',
        [-45, -30, -15, 0, 15, 30, 45].every((m) => !after.has(new Date(wt + m * 60_000).toISOString())),
      );
      // Clear it, so the tests below see the mentor's normal week.
      await Booking.deleteMany({ mentor: mentor._id, topic: 'Overlap race' });
    }

    console.log('\n── Bridge: a result reaches three people ──────────────────');
    const studentVector = [0.88, 0.65, 0.2, 0.1, 0.3];
    const result = await DiscoveryResult.create({
      student: students[0]._id,
      answers: { status: 2, interests: [3], environment: 0, strength: 1, vision: 2 },
      primary: {
        title: 'Backend engineering',
        sector: 'Technology',
        description: 'Fixture.',
        why: 'Fixture.',
        africanMarket: 'Fixture.',
      },
      provider: 'verify',
      model: 'fixture',
      promptVersion: 'verify-fixture',
      studentVector,
    });
    resultId = String(result._id);

    const surfaced = await surfaceBridgeConsultants(resultId, { studentId: String(students[0]._id) });

    // Recompute the expected ranking independently from what is in the database.
    const eligible = await MentorProfile.find(bridgeEligible('Technology')).lean();
    const expected = rankCandidates(
      studentVector,
      eligible.map((m) => ({ id: String(m._id), vector: m.profileVector })),
    ).map((r) => r.id);

    ok(`exactly ${BRIDGE_SIZE} mentors surfaced`, surfaced.length === BRIDGE_SIZE, `got ${surfaced.length}`);
    const surfacedMentors = await MentorProfile.find({ _id: { $in: surfaced.map((r) => r.mentorId) } }).lean();
    ok(
      'all surfaced mentors are approved and in the result\'s sector',
      surfacedMentors.length === BRIDGE_SIZE &&
        surfacedMentors.every((m) => m.vetted && m.sector === 'Technology'),
    );
    ok(
      'ranked by cosine similarity, matching an independent recomputation',
      JSON.stringify(surfaced.map((r) => r.mentorId)) === JSON.stringify(expected),
      `got ${surfaced.map((r) => r.mentorId)} expected ${expected}`,
    );
    ok(
      'every surfaced mentor is taking bookings, so the bridge never leads to a dead end',
      surfacedMentors.every((m) => m.acceptingBookings !== false),
    );
    const again = await surfaceBridgeConsultants(resultId);
    ok(
      'surfacing is recorded once: a repeat call returns the same set',
      JSON.stringify(again) === JSON.stringify(surfaced),
    );

    try {
      await surfaceBridgeConsultants(resultId, { studentId: String(students[1]._id) });
      ok("another student cannot surface this student's result", false, 'it succeeded');
    } catch (err) {
      ok(
        "another student cannot surface this student's result",
        err instanceof DataError && err.code === 'RESULT_NOT_FOUND',
      );
    }

    // An under-staffed sector must refuse rather than return fewer than three.
    const counts = await Promise.all(
      SECTORS.map(async (sector) => ({
        sector,
        n: await MentorProfile.countDocuments(bridgeEligible(sector)),
      })),
    );
    const thin = counts.find((c) => c.n < BRIDGE_SIZE);
    if (thin) {
      const thinResult = await DiscoveryResult.create({
        ...result.toObject(),
        _id: undefined,
        primary: { ...result.toObject().primary, sector: thin.sector },
      });
      try {
        await surfaceBridgeConsultants(String(thinResult._id));
        ok(`${thin.sector} (${thin.n} mentors) raises INSUFFICIENT_CONSULTANTS`, false, 'it succeeded');
      } catch (err) {
        ok(
          `${thin.sector} (${thin.n} mentors) raises INSUFFICIENT_CONSULTANTS`,
          err instanceof DataError && err.code === 'INSUFFICIENT_CONSULTANTS',
        );
      } finally {
        await DiscoveryResult.deleteOne({ _id: thinResult._id });
      }
    } else {
      console.log(
        `  INFO  every sector has ${BRIDGE_SIZE}+ approved mentors, so INSUFFICIENT_CONSULTANTS cannot occur here (covered offline by npm run verify)`,
      );
    }

    console.log('\n── Bridge bookings ────────────────────────────────────────');
    const otherSector = await MentorProfile.findOne({ vetted: true, sector: { $ne: 'Technology' } }).lean();
    try {
      await createBooking({
        studentId: String(students[0]._id),
        mentorId: String(otherSector!._id),
        startsAt: target,
        topic: 'Bridge mismatch',
        discoveryResultId: resultId,
        viaBridge: true,
      });
      ok('a bridge booking outside the result\'s sector is refused', false, 'it succeeded');
    } catch (err) {
      ok(
        "a bridge booking outside the result's sector is refused (BRIDGE_SECTOR_MISMATCH)",
        err instanceof DataError && err.code === 'BRIDGE_SECTOR_MISMATCH',
      );
    }

    // A same-sector mentor who was not one of the three cannot be booked "via the bridge".
    const unsurfaced = await MentorProfile.findOne({
      vetted: true,
      sector: 'Technology',
      _id: { $nin: surfaced.map((r) => r.mentorId) },
    }).lean();
    if (unsurfaced) {
      const unsurfacedSlots = await listAvailableSlots(String(unsurfaced._id));
      try {
        await createBooking({
          studentId: String(students[0]._id),
          mentorId: String(unsurfaced._id),
          startsAt: new Date(unsurfacedSlots[0].startsAt),
          topic: 'Not surfaced',
          discoveryResultId: resultId,
          viaBridge: true,
        });
        ok('a bridge booking with a mentor not surfaced on the result is refused', false, 'it succeeded');
      } catch (err) {
        ok(
          'a bridge booking with a mentor not surfaced on the result is refused (BRIDGE_NOT_SURFACED)',
          err instanceof DataError && err.code === 'BRIDGE_NOT_SURFACED',
        );
      }
    } else {
      console.log('  INFO  every Technology mentor was surfaced, so BRIDGE_NOT_SURFACED cannot be tried here');
    }

    const top = surfaced[0];
    const topSlots = await listAvailableSlots(top.mentorId);
    const bridgeBooking = await createBooking({
      studentId: String(students[0]._id),
      mentorId: top.mentorId,
      startsAt: new Date(topSlots[0].startsAt),
      topic: 'Bridge booking',
      discoveryResultId: resultId,
      viaBridge: true,
    });
    const rec = await BridgeRecommendation.findOne({ discoveryResult: resultId, mentor: top.mentorId }).lean();
    ok('a valid bridge booking stamps bookedAt on the recommendation', !!rec?.bookedAt);
    ok(
      'and stamps viewedAt too when no view was recorded, so the funnel stays in order',
      !!rec?.viewedAt && rec.viewedAt <= rec.bookedAt!,
    );

    console.log('\n── Students cancelling ─────────────────────────────────────');
    try {
      await cancelBookingForStudent(bridgeBooking.id, String(students[1]._id));
      ok("another student cannot cancel someone else's session", false, 'it succeeded');
    } catch (err) {
      ok(
        "another student cannot cancel someone else's session (same 404 as a missing one)",
        err instanceof DataError && err.code === 'BOOKING_NOT_FOUND',
      );
    }
    try {
      await cancelBookingForStudent(
        bridgeBooking.id,
        String(students[0]._id),
        new Date(Date.parse(bridgeBooking.startsAt) + 60_000),
      );
      ok('a session that has started cannot be cancelled', false, 'it succeeded');
    } catch (err) {
      ok('a session that has started cannot be cancelled', err instanceof DataError && err.code === 'SESSION_STARTED');
    }
    const cancelled = await cancelBookingForStudent(bridgeBooking.id, String(students[0]._id));
    ok('the owner can cancel before it starts', cancelled.status === 'cancelled');
    ok(
      'the cancelled slot is offered again at once',
      (await listAvailableSlots(top.mentorId)).some((sl) => sl.startsAt === bridgeBooking.startsAt),
    );
    const recAfterCancel = await BridgeRecommendation.findOne({ discoveryResult: resultId, mentor: top.mentorId }).lean();
    ok('the bridge still counts the booking it led to', !!recAfterCancel?.bookedAt);

    const funnel = await bridgeFunnel();
    const tech = funnel.find((f) => f.sector === 'Technology');
    ok(
      'the funnel report counts the booked result and computes conversion',
      !!tech &&
        tech.resultsBooked >= 1 &&
        tech.bridgeConversionPct === Math.round((tech.resultsBooked / tech.resultsGenerated) * 10000) / 100,
      JSON.stringify(tech),
    );

    console.log('\n── Who can read a result ──────────────────────────────────');
    ok(
      'the student who owns a result can read it',
      !!(await getDiscoveryResultForStudent(resultId, String(students[0]._id))),
    );
    ok(
      "another student cannot read it",
      (await getDiscoveryResultForStudent(resultId, String(students[1]._id))) === null,
    );
    // Surfaced but not booked: being recommended alone grants no access.
    const unbooked = await MentorProfile.findById(surfaced[1].mentorId).lean();
    ok(
      'a mentor with no booking against it cannot read it, even if surfaced',
      (await getDiscoveryResultForMentor(resultId, String(unbooked!.user))) === null,
    );
    const topMentor = await MentorProfile.findById(top.mentorId).lean();
    const seenByMentor = await getDiscoveryResultForMentor(resultId, String(topMentor!.user));
    ok('the booked mentor can read it', !!seenByMentor);
    ok(
      "but never the student's questionnaire answers",
      !!seenByMentor && !('answers' in seenByMentor),
    );

    console.log('\n── Research events ────────────────────────────────────────');
    await logEvent(RUN, 'verify_event', { step: 1 });
    const event = await AnalyticsEvent.findOne({ participantCode: RUN }).lean();
    ok(
      'an event is stored under the participant code only',
      !!event && !Object.keys(event).some((k) => /user|student/i.test(k)),
    );

    // A consented student's events go under their code, looked up on the server.
    await StudentProfile.create({
      user: students[3]._id,
      initials: 'TS',
      participantCode: RUN,
      consentVersion: 'verify',
      consentedAt: new Date(),
    });
    await logStudentEvent(String(students[3]._id), {
      type: 'booking_requested',
      payload: { sector: 'Technology', viaBridge: true, rank: 1 },
    });
    const studentEvent = await AnalyticsEvent.findOne({ participantCode: RUN, eventType: 'booking_requested' }).lean();
    ok("a student's event is filed under their participant code", !!studentEvent);
    ok(
      'and its payload carries no ids',
      !!studentEvent && !/[0-9a-f]{24}/.test(JSON.stringify(studentEvent.payload)),
    );
    const before = await AnalyticsEvent.countDocuments();
    await logStudentEvent(String(students[4]._id), { type: 'bridge_surfaced', payload: { sector: 'Technology' } });
    ok('a student who has not consented is not recorded', (await AnalyticsEvent.countDocuments()) === before);

    console.log('\n── Saving a discovery ─────────────────────────────────────');
    const answers = { status: 2, interests: [3], environment: 0, strength: 1, vision: 2 };
    const outcome = await generateDiscovery(answers);
    const saved = await saveDiscoveryResult(String(students[3]._id), answers, outcome);
    savedResultId = saved.id;
    const savedDoc = await DiscoveryResult.findById(saved.id).lean();
    ok(
      'a saved result carries the vector calculated from its answers',
      JSON.stringify(savedDoc?.studentVector) === JSON.stringify(studentVectorFor(answers)),
    );
    ok(
      'it is surfaced with three mentors straight away',
      saved.bridge.status === 'ready' && saved.bridge.mentors.length === BRIDGE_SIZE,
    );
    const profileAfter = await StudentProfile.findOne({ user: students[3]._id }).lean();
    ok("the student's profile points to it as their latest result", String(profileAfter?.latestDiscovery) === saved.id);
    const preview = await previewBridge(answers, outcome.result.primary.sector);
    ok(
      'a visitor with the same answers sees the same three, in the same order',
      preview.status === 'ready' &&
        saved.bridge.status === 'ready' &&
        JSON.stringify(preview.mentors.map((m) => m.id)) === JSON.stringify(saved.bridge.mentors.map((m) => m.id)),
    );
    console.log('\n── Session outcomes ───────────────────────────────────────');
    // A confirmed session that started two hours ago, and one next week.
    // Two hours ago, so its time (and the break after it) is clear of the video test's session.
    const hourAgo = new Date(Date.now() - 2 * 3_600_000);
    const [held, future] = await Booking.create([
      {
        student: students[2]._id,
        mentor: mentor._id,
        topic: 'Outcome test',
        startsAt: hourAgo,
        endsAt: new Date(hourAgo.getTime() + 45 * 60_000),
        status: 'confirmed',
      },
      {
        student: students[2]._id,
        mentor: mentor._id,
        topic: 'Outcome test, future',
        startsAt: new Date(Date.now() + 7 * 86_400_000),
        endsAt: new Date(Date.now() + 7 * 86_400_000 + 45 * 60_000),
        status: 'confirmed',
      },
    ]);
    const pastForMentor = await listMyPastSessions(String(mentorUser._id));
    ok("a started, confirmed session waits for the mentor's outcome", pastForMentor.awaiting.some((b) => b.id === String(held._id)));
    try {
      await respondToBooking(String(mentorUser._id), String(future._id), 'complete');
      ok('a session that has not started cannot be marked as held', false, 'it succeeded');
    } catch (err) {
      ok('a session that has not started cannot be marked as held', err instanceof DataError && err.code === 'SESSION_NOT_STARTED');
    }
    try {
      await respondToBooking(String(adminUser._id), String(held._id), 'complete');
      ok("someone else cannot record another mentor's session", false, 'it succeeded');
    } catch (err) {
      ok("someone else cannot record another mentor's session", err instanceof DataError && err.code === 'BOOKING_NOT_FOUND');
    }
    const sessionsBefore = (await MentorProfile.findById(mentor._id).lean())!.sessionCount;
    const reportBefore = await sessionCompletion();
    await respondToBooking(String(mentorUser._id), String(held._id), 'complete');
    const heldAfter = await Booking.findById(held._id).lean();
    ok('the mentor marks it completed', heldAfter?.status === 'completed');
    ok("and the mentor's session count goes up", (await MentorProfile.findById(mentor._id).lean())!.sessionCount === sessionsBefore + 1);
    const reportAfter = await sessionCompletion();
    ok('the completion report counts it as held', reportAfter.reported.held === reportBefore.reported.held + 1);
    try {
      await respondToBooking(String(mentorUser._id), String(held._id), 'no_show');
      ok('an outcome cannot be changed once recorded', false, 'it succeeded');
    } catch (err) {
      ok('an outcome cannot be changed once recorded', err instanceof DataError && err.code === 'INVALID_TRANSITION');
    }

    console.log('\n── Video sessions ─────────────────────────────────────────');
    // A stand-in for Daily: no real rooms are created by the test run.
    const roomsMade: string[] = [];
    const tokens: { user: string; owner: boolean }[] = [];
    let fakeMeetings: { startTime: Date; durationSeconds: number; participants: number }[] = [];
    const fakeDaily = {
      async ensureRoom(name: string) {
        if (!roomsMade.includes(name)) roomsMade.push(name);
        return { name, url: `https://pathora.daily.co/${name}` };
      },
      async createToken(_room: string, user: string, owner: boolean) {
        tokens.push({ user, owner });
        return `token-for-${user}`;
      },
      async meetings() {
        return fakeMeetings;
      },
      async deleteRoom() {},
    };
    const soon = new Date(Date.now() + 5 * 60_000);
    const [callBooking, laterBooking] = await Booking.create([
      { student: students[1]._id, mentor: mentor._id, topic: 'Video test', startsAt: soon, endsAt: new Date(soon.getTime() + 45 * 60_000), status: 'confirmed' },
      { student: students[1]._id, mentor: mentor._id, topic: 'Video later', startsAt: new Date(Date.now() + 3 * 86_400_000), endsAt: new Date(Date.now() + 3 * 86_400_000 + 45 * 60_000), status: 'confirmed' },
    ]);
    try {
      await joinVideoSession(String(callBooking._id), String(students[2]._id), { client: fakeDaily });
      ok("someone else cannot join another person's session", false, 'it succeeded');
    } catch (err) {
      ok("someone else cannot join another person's session (same 404 as a missing one)", err instanceof DataError && err.code === 'BOOKING_NOT_FOUND');
    }
    try {
      await joinVideoSession(String(laterBooking._id), String(students[1]._id), { client: fakeDaily });
      ok('the call cannot be joined before it opens', false, 'it succeeded');
    } catch (err) {
      ok('the call cannot be joined before it opens', err instanceof DataError && err.code === 'SESSION_NOT_OPEN');
    }
    const studentJoin = await joinVideoSession(String(callBooking._id), String(students[1]._id), { client: fakeDaily });
    const mentorJoin = await joinVideoSession(String(callBooking._id), String(mentorUser._id), { client: fakeDaily });
    ok('the student and the mentor get the same room', studentJoin.roomUrl === mentorJoin.roomUrl && roomsMade.length === 1);
    ok('each gets their own pass, and only the mentor hosts', tokens.length === 2 && tokens.some((t) => t.owner) && tokens.some((t) => !t.owner));
    ok('the mentor sees only the student\'s first name', tokens.some((t) => !t.owner && t.user === 'Test'));
    const vs = await VideoSession.findOne({ booking: callBooking._id }).lean();
    ok('both joins are recorded', !!vs?.studentJoinedAt && !!vs?.mentorJoinedAt);
    const meetingStart = new Date(Date.now() - 60_000);
    fakeMeetings = [{ startTime: meetingStart, durationSeconds: 2520, participants: 2 }];
    const synced = await syncVideoSession(String(callBooking._id), String(students[1]._id), { client: fakeDaily });
    ok("the call's length comes from Daily's own records", synced.status === 'ended' && synced.durationSeconds === 2520);
    ok('the session-completion report counts the ended call', (await sessionCompletion()).sessionsEnded >= 1);
    await VideoSession.deleteMany({ booking: { $in: [callBooking._id, laterBooking._id] } });

    console.log('\n── Password reset ─────────────────────────────────────────');
    const resetUser = await User.create({
      name: `Reset Person ${RUN}`,
      email: `reset.${RUN}@pathora.test`,
      role: 'student',
      passwordHash: await bcrypt.hash('oldpass123', 4),
    });
    const outbox: { to: string; text: string }[] = [];
    const capture = async (e: { to: string; subject: string; text: string }) => {
      outbox.push(e);
      return { sent: true };
    };
    const linkIn = (text: string) => /token=([A-Za-z0-9_-]+)/.exec(text)?.[1] ?? '';

    await requestPasswordReset(`nobody.${RUN}@pathora.test`, 'https://pathora.test', { send: capture });
    ok('an unknown email gets no email (and the same answer)', outbox.length === 0);
    await requestPasswordReset(`RESET.${RUN}@pathora.test`, 'https://pathora.test', { send: capture });
    ok('a known email gets a link on the configured site', outbox.length === 1 && outbox[0].text.includes('https://pathora.test/reset-password?token='));
    const token = linkIn(outbox[0].text);
    const storedLink = await PasswordReset.findOne({ user: resetUser._id }).lean();
    ok('only a hash of the token is stored', !!storedLink && storedLink.tokenHash !== token && !JSON.stringify(storedLink).includes(token));

    await resetPassword(token, 'newpass456');
    ok('the new password works', !!(await verifyCredentials(resetUser.email, 'newpass456')));
    ok('the old one does not', !(await verifyCredentials(resetUser.email, 'oldpass123')));
    const changed = await getSessionState(String(resetUser._id));
    ok('the change is recorded, which ends older sessions', !!changed?.passwordChangedAt);
    try {
      await resetPassword(token, 'another789');
      ok('a link works only once', false, 'it succeeded');
    } catch (err) {
      ok('a link works only once', err instanceof DataError && err.code === 'INVALID_RESET_LINK');
    }
    await requestPasswordReset(resetUser.email, 'https://pathora.test', { send: capture, now: new Date(Date.now() - 2 * 3_600_000) });
    try {
      await resetPassword(linkIn(outbox[outbox.length - 1].text), 'another789');
      ok('an expired link is refused', false, 'it succeeded');
    } catch (err) {
      ok('an expired link is refused', err instanceof DataError && err.code === 'INVALID_RESET_LINK');
    }
    const rateUser = await User.create({ name: `Rate Person ${RUN}`, email: `rate.${RUN}@pathora.test`, role: 'student' });
    const sentBefore = outbox.length;
    for (let i = 0; i < 5; i++) await requestPasswordReset(rateUser.email, 'https://pathora.test', { send: capture });
    ok('at most three links an hour', outbox.length - sentBefore === 3, `${outbox.length - sentBefore} sent`);

    console.log('\n── Withdrawing and deleting an account ────────────────────');
    const leaver = await User.create({
      name: `Leaving Student ${RUN}`,
      email: `leaver.${RUN}@pathora.test`,
      role: 'student',
      passwordHash: await bcrypt.hash('leave1234', 4),
    });
    const leaverCode = `L-${RUN}`;
    await StudentProfile.create({ user: leaver._id, initials: 'LS', participantCode: leaverCode, consentVersion: 'verify', consentedAt: new Date() });
    const leaverAnswers = { status: 1, interests: [1], environment: 0, strength: 1, vision: 2 };
    const leaverResult = await saveDiscoveryResult(String(leaver._id), leaverAnswers, await generateDiscovery(leaverAnswers));
    await logStudentEvent(String(leaver._id), { type: 'bridge_surfaced', payload: { sector: 'Technology' } });
    const leaverSlot = (await listAvailableSlots(String(mentor._id)))[3];
    await createBooking({ studentId: String(leaver._id), mentorId: String(mentor._id), startsAt: new Date(leaverSlot.startsAt), topic: 'Leaving soon' });

    try {
      await deleteAccount(String(leaver._id), 'wrong-password1');
      ok('the wrong password deletes nothing', false, 'it succeeded');
    } catch (err) {
      ok('the wrong password deletes nothing', err instanceof DataError && err.code === 'WRONG_PASSWORD' && !!(await User.exists({ _id: leaver._id })));
    }
    try {
      await deleteAccount(String(adminUser._id), null);
      ok('an admin cannot delete themselves here', false, 'it succeeded');
    } catch (err) {
      ok('an admin cannot delete themselves here', err instanceof DataError && err.code === 'CANNOT_DELETE_ADMIN');
    }

    await deleteAccount(String(leaver._id), 'leave1234');
    const left = {
      user: await User.exists({ _id: leaver._id }),
      profile: await StudentProfile.exists({ user: leaver._id }),
      results: await DiscoveryResult.countDocuments({ student: leaver._id }),
      recs: await BridgeRecommendation.countDocuments({ discoveryResult: leaverResult.id }),
      bookings: await Booking.countDocuments({ student: leaver._id }),
      events: await AnalyticsEvent.countDocuments({ participantCode: leaverCode }),
    };
    ok('the account and profile are gone', !left.user && !left.profile);
    ok('the answers, result and its matched mentors are gone', left.results === 0 && left.recs === 0);
    ok('the bookings are gone, freeing the slot', left.bookings === 0 && (await listAvailableSlots(String(mentor._id))).some((sl) => sl.startsAt === leaverSlot.startsAt));
    ok('the research events under their code are gone', left.events === 0);
    ok('their session ends on the next request', (await getSessionState(String(leaver._id))) === null);

    console.log('\n── Specific dates in a mentor\'s hours ────────────────────');
    // A mentor of its own, so the shared fixture's hours stay as they were.
    const datesUser = await User.create({ name: 'Dates Mentor', email: `dates.${RUN}@pathora.test`, role: 'mentor' });
    const datesMentor = await MentorProfile.create({
      user: datesUser._id,
      displayName: `Dates Mentor ${RUN}`,
      initials: 'DM',
      role: 'Tester',
      company: 'Pathora',
      sector: 'Technology',
      experience: 3,
      bio: 'Fixture.',
      timezone: 'Africa/Lagos',
      status: 'approved',
      approvedBy: adminUser._id,
      approvedAt: new Date(),
    });
    await Availability.create({ mentor: datesMentor._id, weekly: [], horizonDays: 30, leadTimeHours: 24 });
    try {
      const uid = String(datesUser._id);
      const tz = 'Africa/Lagos';
      const today = formatZonedDate(new Date(), tz);
      const dowOf = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();
      // The first Monday at least a week away, then that week's Tuesday and Saturday.
      let monday = addDays(today, 7);
      while (dowOf(monday) !== 1) monday = addDays(monday, 1);
      const tuesday = addDays(monday, 1);
      const saturday = addDays(monday, 5);
      const weekdays = [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startMinute: 540, endMinute: 1020 }));

      await updateMyAvailability(uid, {
        acceptingBookings: true,
        weekly: weekdays,
        dates: [
          { date: saturday, blocked: false, windows: [{ startMinute: 600, endMinute: 720 }] },
          { date: monday, blocked: false, windows: [{ startMinute: 780, endMinute: 900 }] },
          { date: tuesday, blocked: true, windows: [] },
          { date: addDays(today, -3), blocked: true, windows: [] },
        ],
      });
      const slots = await listAvailableSlots(String(datesMentor._id));
      const localTimes = (date: string) =>
        slots
          .filter((sl) => formatZonedDate(new Date(sl.startsAt), tz) === date)
          .map((sl) =>
            new Date(sl.startsAt).toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }),
          );
      ok("a date's own hours replace that weekday's hours", localTimes(monday).join(',') === '13:00,13:15,13:30,13:45,14:00,14:15', localTimes(monday).join(','));
      ok('a day off offers no slots', localTimes(tuesday).length === 0);
      ok('a usually free weekend date can be opened', localTimes(saturday).join(',') === '10:00,10:15,10:30,10:45,11:00,11:15', localTimes(saturday).join(','));
      // 09:00–17:00: a start every 15 minutes from 09:00 to 16:15.
      ok('other weekdays keep their weekly hours', localTimes(addDays(monday, 2)).length === 30);

      const mine = await getMyAvailability(uid);
      ok(
        'the mentor gets the dates back in order, without the past one',
        mine?.dates.map((d) => d.date).join(',') === [monday, tuesday, saturday].join(','),
        mine?.dates.map((d) => d.date).join(','),
      );

      await updateMyAvailability(uid, { acceptingBookings: true, weekly: weekdays });
      ok('saving weekly hours alone keeps the dates', (await getMyAvailability(uid))?.dates.length === 3);

      const refused = async (dates: { date: string; blocked: boolean; windows: { startMinute: number; endMinute: number }[] }[]) => {
        try {
          await updateMyAvailability(uid, { acceptingBookings: true, weekly: weekdays, dates });
          return false;
        } catch (err) {
          return err instanceof DataError && err.code === 'INVALID_AVAILABILITY';
        }
      };
      ok('overlapping hours on one date are refused', await refused([{ date: monday, blocked: false, windows: [{ startMinute: 600, endMinute: 720 }, { startMinute: 690, endMinute: 780 }] }]));
      ok('the same date twice is refused', await refused([{ date: monday, blocked: true, windows: [] }, { date: monday, blocked: true, windows: [] }]));
      ok('an available date with no hours is refused', await refused([{ date: monday, blocked: false, windows: [] }]));
      ok('a date that does not exist is refused', await refused([{ date: '2027-02-30', blocked: true, windows: [] }]));
      ok('a date more than a year ahead is refused', await refused([{ date: addDays(today, 400), blocked: true, windows: [] }]));
      ok('a refused save changes nothing', (await getMyAvailability(uid))?.dates.length === 3);

      // Minimum notice: with 30 minutes, hours open today are bookable today.
      const allDay = [{ startMinute: 0, endMinute: 1440 }];
      const soonDates = [0, 1].map((n) => ({ date: addDays(today, n), blocked: false, windows: allDay }));
      await updateMyAvailability(uid, { acceptingBookings: true, weekly: weekdays, dates: soonDates, noticeHours: 0.5 });
      const soon = await getMyAvailability(uid);
      const waitMin = soon?.nextSlotAt ? (new Date(soon.nextSlotAt).getTime() - Date.now()) / 60_000 : -1;
      ok('the notice setting is saved', soon?.noticeHours === 0.5);
      ok('with 30 minutes notice the next session is within 90 minutes', waitMin >= 30 && waitMin <= 90, `${waitMin} minutes`);
      ok(
        'the mentor sees the same first time students do',
        soon?.nextSlotAt === (await listAvailableSlots(String(datesMentor._id)))[0]?.startsAt,
      );
      await updateMyAvailability(uid, { acceptingBookings: true, weekly: weekdays, dates: soonDates, noticeHours: 24 });
      const later = await getMyAvailability(uid);
      ok(
        'with a day of notice nothing in the next 24 hours is offered',
        !!later?.nextSlotAt && new Date(later.nextSlotAt).getTime() - Date.now() >= 24 * 3_600_000,
      );
      let badNotice = false;
      try {
        await updateMyAvailability(uid, { acceptingBookings: true, weekly: weekdays, noticeHours: 5 });
      } catch (err) {
        badNotice = err instanceof DataError && err.code === 'INVALID_AVAILABILITY';
      }
      ok('a notice period outside the list is refused', badNotice);
      await updateMyAvailability(uid, { acceptingBookings: true, weekly: weekdays, noticeHours: 10 / 60 });
      ok('10 minutes is an allowed notice period', (await getMyAvailability(uid))?.noticeHours === 10 / 60);
      ok('the mentor is shown as approved', later?.status === 'approved');

      await updateMyAvailability(uid, { acceptingBookings: true, weekly: weekdays, dates: [] });
      const tuesdayAgain = (await listAvailableSlots(String(datesMentor._id))).filter(
        (sl) => formatZonedDate(new Date(sl.startsAt), tz) === tuesday,
      );
      ok(
        'removing every date returns to weekly hours',
        (await getMyAvailability(uid))?.dates.length === 0 && tuesdayAgain.length === 30,
      );
    } finally {
      await Availability.deleteMany({ mentor: datesMentor._id });
      await MentorProfile.deleteMany({ _id: datesMentor._id });
    }

    console.log('\n── Student feedback and the admin views ───────────────────');
    {
      const rater = await User.create({ name: `Rater Person ${RUN}`, email: `rater.${RUN}@pathora.test`, role: 'student' });
      const raterCode = `F-${RUN}`;
      await StudentProfile.create({ user: rater._id, initials: 'RP', participantCode: raterCode, consentVersion: 'test', consentedAt: new Date() });
      const other = students[4];
      const at = (hoursFromNow: number) => new Date(Date.now() + hoursFromNow * 3_600_000);
      const make = (hours: number, status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show') =>
        Booking.create({ student: rater._id, mentor: mentor._id, topic: `Feedback ${RUN}`, startsAt: at(hours), endsAt: at(hours + 0.75), status });
      try {
        const held = await make(-50, 'completed');
        const ended = await make(-30, 'confirmed');
        const future = await make(200, 'confirmed');
        const cancelled = await make(-70, 'cancelled');
        const refusedWith = async (code: string, fn: () => Promise<unknown>) => {
          try {
            await fn();
            return false;
          } catch (err) {
            return err instanceof DataError && err.code === code;
          }
        };

        ok('a session that has not ended cannot be rated', await refusedWith('SESSION_NOT_OVER', () => rateSession(String(future._id), String(rater._id), { score: 5 })));
        ok('a cancelled session cannot be rated', await refusedWith('NOT_RATEABLE', () => rateSession(String(cancelled._id), String(rater._id), { score: 5 })));
        ok("another student cannot rate someone's session", await refusedWith('BOOKING_NOT_FOUND', () => rateSession(String(held._id), String(other._id), { score: 5 })));
        ok('stars outside 1 to 5 are refused', await refusedWith('NOT_RATEABLE', () => rateSession(String(held._id), String(rater._id), { score: 6 })));

        await rateSession(String(held._id), String(rater._id), { score: 4, comment: '  Clear advice on my CV.  ' });
        let m = await MentorProfile.findById(mentor._id).lean();
        ok('a rating updates the mentor average', m?.ratingAvg === 4 && m?.ratingCount === 1, JSON.stringify({ a: m?.ratingAvg, n: m?.ratingCount }));
        ok('the comment is kept, trimmed', (await Booking.findById(held._id).lean())?.rating?.comment === 'Clear advice on my CV.');
        ok('a session can be rated only once', await refusedWith('ALREADY_RATED', () => rateSession(String(held._id), String(rater._id), { score: 1 })));

        await rateSession(String(ended._id), String(rater._id), { score: 3 });
        m = await MentorProfile.findById(mentor._id).lean();
        ok('a second rating averages in (4 and 3 make 3.5)', m?.ratingAvg === 3.5 && m?.ratingCount === 2);
        await respondToBooking(String(mentorUser._id), String(ended._id), 'no_show');
        m = await MentorProfile.findById(mentor._id).lean();
        ok('a rating stops counting if the mentor says the session did not happen', m?.ratingAvg === 4 && m?.ratingCount === 1);

        const sessions = await listSessionsForAdmin({ view: 'all', mentorId: String(mentor._id) });
        const heldRow = sessions.rows.find((r) => r.id === String(held._id));
        ok('the admin sees each session with its rating and comment', heldRow?.rating?.score === 4 && heldRow.rating.comment === 'Clear advice on my CV.');
        ok('students appear by participant code', heldRow?.participantCode === raterCode);
        ok('never by name or email', !JSON.stringify(sessions).includes('Rater Person') && !JSON.stringify(sessions).includes(`rater.${RUN}`));
        ok('sessions can be filtered by outcome', (await listSessionsForAdmin({ view: 'missed', mentorId: String(mentor._id) })).rows.some((r) => r.id === String(ended._id)));
        ok('the filter counts add up', sessions.counts.held >= 1 && sessions.counts.missed >= 1 && sessions.counts.cancelled >= 1);

        const feedback = await feedbackSummary();
        ok('the feedback page lists the comment', feedback.comments.some((c) => c.comment === 'Clear advice on my CV.' && c.participantCode === raterCode));
        ok('a missed session’s rating is left out of the totals', !feedback.comments.some((c) => c.bookingId === String(ended._id)));
        const row = feedback.byMentor.find((r) => r.mentorId === String(mentor._id));
        ok('each mentor has a row of held, missed and cancelled sessions', !!row && row.held >= 1 && row.missed >= 1 && row.cancelled >= 1 && row.averageRating === 4);
        ok('feedback holds no names or emails', !JSON.stringify(feedback).includes('Rater Person') && !JSON.stringify(feedback).includes(`rater.${RUN}`));

        const people = await listParticipants();
        const me = people.rows.find((r) => r.participantCode === raterCode);
        ok('the participant list shows their activity', me?.booked === 4 && me.held === 1 && me.rated === 2, JSON.stringify(me));
        ok('the participant list holds no names or emails', !JSON.stringify(people).includes('Rater Person'));

        // Deleting the account takes the ratings with it.
        await User.updateOne({ _id: rater._id }, { $unset: { passwordHash: 1 } });
        await deleteAccount(String(rater._id), null);
        m = await MentorProfile.findById(mentor._id).lean();
        ok("a student's ratings leave with their account", m?.ratingCount === 0 && m?.ratingAvg === 0);
      } finally {
        await Booking.deleteMany({ student: rater._id });
        await StudentProfile.deleteMany({ user: rater._id });
      }
    }

    console.log('\n── Opportunities ──────────────────────────────────────────');
    const feedXml = `<rss><channel>
      <item><title>Open Fellowship ${RUN}</title><link>https://example.org/${RUN}/open</link>
        <description>Deadline: December 31, 2099 Applications are open.</description></item>
      <item><title>Closed Grant ${RUN}</title><link>https://example.org/${RUN}/closed</link>
        <description>Deadline: January 1, 2001 Too late.</description></item>
    </channel></rss>`;
    // A stand-in for the publishers: no network is touched.
    const fakeFetch = (async () => new Response(feedXml, { status: 200 })) as unknown as typeof fetch;
    const opportunityFilter = { url: { $regex: RUN } };

    await refreshOpportunities({ fetchImpl: fakeFetch });
    await refreshOpportunities({ fetchImpl: fakeFetch });
    ok(
      'reading the feeds twice stores each listing once',
      (await Opportunity.countDocuments({ url: `https://example.org/${RUN}/open` })) === 1,
    );
    ok(
      'a listing whose deadline has passed is not stored',
      (await Opportunity.countDocuments({ url: `https://example.org/${RUN}/closed` })) === 0,
    );
    const listed = await listOpportunities({ limit: 500 });
    const mine = listed.find((o) => o.url === `https://example.org/${RUN}/open`);
    ok('it is listed for students, with its deadline and type', !!mine && mine.type === 'Fellowship' && !!mine.deadline);

    await hideOpportunity(mine!.id);
    await refreshOpportunities({ fetchImpl: fakeFetch });
    ok(
      'a listing an admin took down stays down after the next refresh',
      !(await listOpportunities({ limit: 500 })).some((o) => o.id === mine!.id),
    );

    const added = await addOpportunity({
      title: `ALU SPD placement ${RUN}`,
      type: 'Internship',
      sector: null,
      url: `https://example.org/${RUN}/spd`,
      deadline: null,
      source: 'alu-spd',
    });
    ok('an admin can add an ALU SPD listing', added.sourceName === 'ALU SPD');
    try {
      await addOpportunity({
        title: 'Duplicate',
        type: 'Internship',
        sector: null,
        url: `https://example.org/${RUN}/spd`,
        deadline: null,
        source: 'alu-spd',
      });
      ok('the same link cannot be added twice', false, 'it succeeded');
    } catch (err) {
      ok('the same link cannot be added twice', err instanceof DataError && err.code === 'INVALID_OPPORTUNITY');
    }
    await Opportunity.deleteMany(opportunityFilter);

    console.log('\n── Pathy allowance ────────────────────────────────────────');
    const sinceStart = new Date(Date.now() - 60_000);
    const pathyBefore = await countStudentEvents(String(students[3]._id), 'pathy_message', sinceStart);
    await logStudentEvent(String(students[3]._id), {
      type: 'pathy_message',
      payload: { sector: 'Technology', promptVersion: 'verify', model: 'none', usedFallback: true },
    });
    ok(
      "a student's Pathy messages are counted for the daily allowance",
      (await countStudentEvents(String(students[3]._id), 'pathy_message', sinceStart)) === pathyBefore + 1,
    );
    const pathyEvent = await AnalyticsEvent.findOne({ participantCode: RUN, eventType: 'pathy_message' }).lean();
    ok('and the event holds no message text', !!pathyEvent && !('content' in (pathyEvent.payload ?? {})) && !('message' in (pathyEvent.payload ?? {})));
  } finally {
    await Opportunity.deleteMany({ url: { $regex: RUN } }).catch(() => {});
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
