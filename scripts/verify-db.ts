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
  StudentProfile,
  User,
} from '../lib/db/models';
import { cancelBookingForStudent, createBooking } from '../lib/db/queries/bookings';
import { previewBridge, saveDiscoveryResult } from '../lib/db/queries/discovery';
import { generateDiscovery } from '../lib/ai/discovery';
import { studentVectorFor } from '../lib/discovery/questions';
import { listAvailableSlots } from '../lib/db/queries/mentors';
import { bridgeEligible, surfaceBridgeConsultants } from '../lib/db/queries/bridge';
import { getDiscoveryResultForMentor, getDiscoveryResultForStudent } from '../lib/db/queries/access';
import { bridgeFunnel, countStudentEvents, logEvent, logStudentEvent } from '../lib/db/queries/research';
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
