/**
 * Offline verification suite. No database, no network, no API keys.
 *
 *   npm run verify
 *
 * Covers the two things that are painful to debug later: schema invariants
 * (especially the double-booking index) and slot generation across timezones.
 */
import mongoose from 'mongoose';
import { Availability, Booking, MentorProfile, User } from '../lib/db/models';
import {
  addDays,
  formatZonedDate,
  getZoneOffsetMs,
  isValidTimeZone,
  isoDateDayOfWeek,
  zonedWallTimeToUtc,
} from '../lib/booking/timezone';
import {
  findSlot,
  generateSlots,
  groupSlotsByDay,
  type AvailabilityRules,
} from '../lib/booking/slots';
import {
  INTEREST_OPTIONS,
  scoreSectors,
  topSector,
  describeAnswers,
  type DiscoveryAnswers,
} from '../lib/discovery/questions';
import { DiscoveryAnswersSchema } from '../lib/discovery/validation';
import { extractJson, parseCareerMatch, CareerMatchSchema } from '../lib/ai/schema';
import { generateMockMatch } from '../lib/ai/providers/mock';
import { createLlmProvider } from '../lib/ai/providers/llm';
import { resolveProvider, ProviderConfigError } from '../lib/ai/provider';
import { generateDiscovery } from '../lib/ai/discovery';
import {
  DataError,
  STATUS_FOR_CODE,
  isDuplicateKeyError,
  statusForError,
} from '../lib/db/queries/errors';
import { toBookingDTO, toMentorDTO, toOpportunityDTO } from '../lib/db/queries/dto';
import { occupiesSlot } from '../lib/db/queries/bookings';

let passed = 0;
let failed = 0;
let group = '';

const section = (name: string) => {
  group = name;
  console.log(`\n── ${name} ${'─'.repeat(Math.max(0, 58 - name.length))}`);
};

function ok(label: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
  }
}

const eq = (label: string, actual: unknown, expected: unknown) =>
  ok(
    label,
    JSON.stringify(actual) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );

async function rejects(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    ok(label, false, 'expected it to reject, but it resolved');
  } catch {
    ok(label, true);
  }
}

const iso = (d: Date) => d.toISOString();

/** First date on/after `fromISO` falling on `dow`. Avoids hardcoding weekdays. */
function nextDayOfWeek(fromISO: string, dow: number): string {
  let d = fromISO;
  for (let i = 0; i < 8; i++) {
    if (isoDateDayOfWeek(d) === dow) return d;
    d = addDays(d, 1);
  }
  throw new Error('unreachable');
}

// ═══════════════════════════════════════════════════════════════════════════
async function timezoneTests() {
  section('Timezone');

  const jan = new Date('2027-01-15T12:00:00Z');
  const jul = new Date('2027-07-15T12:00:00Z');

  eq('Lagos is UTC+1 in January', getZoneOffsetMs(jan, 'Africa/Lagos'), 3_600_000);
  eq('Lagos is UTC+1 in July (no DST)', getZoneOffsetMs(jul, 'Africa/Lagos'), 3_600_000);

  eq(
    'New York is UTC-5 in winter',
    getZoneOffsetMs(jan, 'America/New_York'),
    -5 * 3_600_000,
  );
  eq('New York is UTC-4 in summer', getZoneOffsetMs(jul, 'America/New_York'), -4 * 3_600_000);

  // The DST case: identical wall time, different UTC instant.
  eq(
    '10:00 New York in winter -> 15:00Z',
    iso(zonedWallTimeToUtc('2027-01-11', 600, 'America/New_York')),
    '2027-01-11T15:00:00.000Z',
  );
  eq(
    '10:00 New York in summer -> 14:00Z',
    iso(zonedWallTimeToUtc('2027-07-12', 600, 'America/New_York')),
    '2027-07-12T14:00:00.000Z',
  );
  eq(
    '09:00 Lagos -> 08:00Z',
    iso(zonedWallTimeToUtc('2026-09-07', 540, 'Africa/Lagos')),
    '2026-09-07T08:00:00.000Z',
  );

  // Late-UTC instants belong to the next calendar day in Lagos.
  eq(
    '23:30Z falls on the next day in Lagos',
    formatZonedDate(new Date('2026-09-07T23:30:00Z'), 'Africa/Lagos'),
    '2026-09-08',
  );

  eq('addDays crosses a month', addDays('2026-01-31', 1), '2026-02-01');
  eq('addDays crosses a year', addDays('2026-12-31', 1), '2027-01-01');
  eq('addDays handles a leap day', addDays('2028-02-28', 1), '2028-02-29');
  eq('addDays goes backwards', addDays('2026-03-01', -1), '2026-02-28');

  ok('valid zone accepted', isValidTimeZone('Africa/Lagos'));
  ok('invalid zone rejected', !isValidTimeZone('Not/AZone'));
}

// ═══════════════════════════════════════════════════════════════════════════
function baseRules(overrides: Partial<AvailabilityRules> = {}): AvailabilityRules {
  return {
    weekly: [{ dayOfWeek: 1, startMinute: 540, endMinute: 720 }], // Mon 09:00–12:00
    exceptions: [],
    sessionMinutes: 45,
    bufferMinutes: 15,
    leadTimeHours: 0,
    horizonDays: 365,
    ...overrides,
  };
}

async function slotTests() {
  section('Slot generation');

  const tz = 'Africa/Lagos';
  const monday = nextDayOfWeek('2026-09-07', 1);
  const now = new Date('2026-09-01T00:00:00Z');

  // 09:00–12:00 with 45m sessions + 15m buffer = starts at 09:00, 10:00, 11:00.
  const slots = generateSlots({ rules: baseRules(), timeZone: tz, now });
  const mondaySlots = slots.filter((s) => formatZonedDate(s.startsAt, tz) === monday);
  eq(
    'three slots on the Monday, correct UTC instants',
    mondaySlots.map((s) => iso(s.startsAt)),
    [`${monday}T08:00:00.000Z`, `${monday}T09:00:00.000Z`, `${monday}T10:00:00.000Z`],
  );
  eq('slot length is 45 minutes', mondaySlots[0].endsAt.getTime() - mondaySlots[0].startsAt.getTime(), 45 * 60_000);
  ok('only Mondays are generated', slots.every((s) => isoDateDayOfWeek(formatZonedDate(s.startsAt, tz)) === 1));
  ok('slots are sorted', slots.every((s, i) => i === 0 || s.startsAt >= slots[i - 1].startsAt));

  // Lead time.
  const lead = generateSlots({
    rules: baseRules({ leadTimeHours: 24 }),
    timeZone: tz,
    now: new Date(`${monday}T00:00:00Z`),
  });
  ok(
    'lead time hides slots that are too soon',
    lead.every((s) => formatZonedDate(s.startsAt, tz) !== monday),
  );

  // Horizon.
  const horizon = generateSlots({ rules: baseRules({ horizonDays: 7 }), timeZone: tz, now });
  ok(
    'horizon caps how far out slots go',
    horizon.every((s) => s.startsAt.getTime() <= now.getTime() + 7 * 86_400_000),
  );
  ok('horizon still yields something', horizon.length > 0);

  // Exceptions.
  const blocked = generateSlots({
    rules: baseRules({ exceptions: [{ date: monday, blocked: true, windows: [] }] }),
    timeZone: tz,
    now,
  });
  ok(
    'a blocked exception clears that day',
    blocked.every((s) => formatZonedDate(s.startsAt, tz) !== monday),
  );

  const overridden = generateSlots({
    rules: baseRules({
      exceptions: [
        { date: monday, blocked: false, windows: [{ startMinute: 840, endMinute: 930 }] }, // 14:00–15:30
      ],
    }),
    timeZone: tz,
    now,
  });
  eq(
    'an exception replaces that day\'s weekly rules',
    overridden
      .filter((s) => formatZonedDate(s.startsAt, tz) === monday)
      .map((s) => iso(s.startsAt)),
    [`${monday}T13:00:00.000Z`], // 14:00 Lagos; 15:00 would end 15:45 > 15:30
  );

  // Busy intervals.
  const exactClash = generateSlots({
    rules: baseRules(),
    timeZone: tz,
    now,
    busy: [
      { startsAt: new Date(`${monday}T09:00:00Z`), endsAt: new Date(`${monday}T09:45:00Z`) },
    ],
  }).filter((s) => formatZonedDate(s.startsAt, tz) === monday);
  eq(
    'an existing booking removes exactly its own slot',
    exactClash.map((s) => iso(s.startsAt)),
    [`${monday}T08:00:00.000Z`, `${monday}T10:00:00.000Z`],
  );

  // Buffer: this booking does not overlap the 08:00 slot, but leaves < 15m gap.
  const bufferClash = generateSlots({
    rules: baseRules(),
    timeZone: tz,
    now,
    busy: [
      { startsAt: new Date(`${monday}T08:50:00Z`), endsAt: new Date(`${monday}T09:35:00Z`) },
    ],
  }).filter((s) => formatZonedDate(s.startsAt, tz) === monday);
  eq(
    'buffer removes a non-overlapping but too-close slot',
    bufferClash.map((s) => iso(s.startsAt)),
    [`${monday}T10:00:00.000Z`],
  );

  // findSlot — the server-side guard.
  const input = { rules: baseRules(), timeZone: tz, now };
  ok('findSlot accepts a real slot', findSlot(input, new Date(`${monday}T09:00:00Z`)) !== null);
  ok(
    'findSlot rejects an off-grid time',
    findSlot(input, new Date(`${monday}T09:17:00Z`)) === null,
  );
  ok(
    'findSlot rejects a time outside working hours',
    findSlot(input, new Date(`${monday}T03:00:00Z`)) === null,
  );
  ok(
    'findSlot rejects a slot already taken',
    findSlot(
      {
        ...input,
        busy: [
          { startsAt: new Date(`${monday}T09:00:00Z`), endsAt: new Date(`${monday}T09:45:00Z`) },
        ],
      },
      new Date(`${monday}T09:00:00Z`),
    ) === null,
  );

  // Grouping for the picker UI.
  const grouped = groupSlotsByDay(slots.slice(0, 6), tz);
  ok('grouping returns ascending days', grouped.every((g, i) => i === 0 || g.date > grouped[i - 1].date));
  ok('grouping preserves every slot', grouped.reduce((n, g) => n + g.slots.length, 0) === 6);

  // Degenerate input must not hang.
  eq('zero-length session yields nothing', generateSlots({ rules: baseRules({ sessionMinutes: 0 }), timeZone: tz, now }).length, 0);
  eq('inverted range yields nothing', generateSlots({ rules: baseRules(), timeZone: tz, now, from: new Date('2027-01-02'), to: new Date('2027-01-01') }).length, 0);

  // DST: same local hour, two different UTC offsets.
  section('Slot generation across DST');
  const nyRules = baseRules({
    weekly: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, startMinute: 600, endMinute: 660 })),
    sessionMinutes: 60,
    bufferMinutes: 0,
  });
  const nyInput = { rules: nyRules, timeZone: 'America/New_York', now: new Date('2026-12-01T00:00:00Z') };

  eq(
    'winter 10:00 New York slot is 15:00Z',
    generateSlots({ ...nyInput, from: new Date('2027-01-11T00:00:00Z'), to: new Date('2027-01-11T23:59:59Z') }).map((s) => iso(s.startsAt)),
    ['2027-01-11T15:00:00.000Z'],
  );
  eq(
    'summer 10:00 New York slot is 14:00Z',
    generateSlots({ ...nyInput, from: new Date('2027-07-12T00:00:00Z'), to: new Date('2027-07-12T23:59:59Z') }).map((s) => iso(s.startsAt)),
    ['2027-07-12T14:00:00.000Z'],
  );
}

// ═══════════════════════════════════════════════════════════════════════════
async function schemaTests() {
  section('Schema');

  const mentorId = new mongoose.Types.ObjectId();
  const studentId = new mongoose.Types.ObjectId();

  const mkBooking = (over: Record<string, unknown> = {}) =>
    new Booking({
      student: studentId,
      mentor: mentorId,
      topic: 'Product career review',
      startsAt: new Date('2026-09-07T08:00:00Z'),
      endsAt: new Date('2026-09-07T08:45:00Z'),
      ...over,
    });

  await rejects('Booking rejects endsAt <= startsAt', () =>
    mkBooking({ endsAt: new Date('2026-09-07T07:00:00Z') }).validate(),
  );

  const confirmed = mkBooking({ status: 'confirmed' });
  await confirmed.validate();
  ok('confirmed booking is active', confirmed.active === true);

  const cancelled = mkBooking({ status: 'cancelled' });
  await cancelled.validate();
  ok('cancelled booking is inactive, freeing the slot', cancelled.active === false);

  await rejects('Booking rejects an unknown status', () => mkBooking({ status: 'maybe' }).validate());
  await rejects('Booking rating is capped at 5', () =>
    mkBooking({ rating: { score: 9 } }).validate(),
  );

  const slotIdx = Booking.schema
    .indexes()
    .find(([, o]) => o?.name === 'one_active_booking_per_slot');
  ok('slot index exists', !!slotIdx);
  eq('slot index keys', slotIdx?.[0], { mentor: 1, startsAt: 1 });
  ok('slot index is unique', slotIdx?.[1]?.unique === true);
  eq('slot index is partial on active', slotIdx?.[1]?.partialFilterExpression, { active: true });

  await rejects('Availability rejects an inverted window', () =>
    new Availability({
      mentor: mentorId,
      weekly: [{ dayOfWeek: 1, startMinute: 600, endMinute: 540 }],
    }).validate(),
  );
  await rejects('Availability rejects an inverted exception window', () =>
    new Availability({
      mentor: mentorId,
      exceptions: [{ date: '2026-09-07', blocked: false, windows: [{ startMinute: 600, endMinute: 600 }] }],
    }).validate(),
  );
  await rejects('Availability rejects a malformed exception date', () =>
    new Availability({
      mentor: mentorId,
      exceptions: [{ date: '07/09/2026', blocked: true, windows: [] }],
    }).validate(),
  );

  const avail = new Availability({ mentor: mentorId, weekly: [{ dayOfWeek: 1, startMinute: 540, endMinute: 720 }] });
  await avail.validate();
  ok(
    'Availability defaults are sane',
    avail.sessionMinutes === 45 && avail.bufferMinutes === 15 && avail.horizonDays === 30,
  );

  const mkMentor = (over: Record<string, unknown> = {}) =>
    new MentorProfile({
      user: new mongoose.Types.ObjectId(),
      displayName: 'Zainab Mensah',
      initials: 'zm',
      role: 'Creative Director',
      company: 'Freelance',
      sector: 'Creative',
      experience: 8,
      bio: 'b',
      ...over,
    });

  await rejects('MentorProfile rejects an unknown sector', () => mkMentor({ sector: 'Marketing' }).validate());
  await rejects('MentorProfile caps focus pills at 3', () =>
    mkMentor({ focus: ['a', 'b', 'c', 'd'] }).validate(),
  );

  const mentor = mkMentor();
  await mentor.validate();
  ok('MentorProfile uppercases initials', mentor.initials === 'ZM');
  ok('MentorProfile defaults to unvetted', mentor.vetted === false);

  ok(
    'MentorProfile has a text search index',
    MentorProfile.schema.indexes().some(([, o]) => o?.name === 'mentor_search'),
  );

  const u = new User({ name: 'A', email: '  A@Example.COM ', role: 'student' });
  u.set('passwordHash', 'super-secret');
  ok('User email is normalised', u.email === 'a@example.com');
  ok('User passwordHash never survives toJSON', !('passwordHash' in u.toJSON()));
  await rejects('User rejects an unknown role', () =>
    new User({ name: 'A', email: 'b@c.d', role: 'wizard' }).validate(),
  );
}

// ═══════════════════════════════════════════════════════════════════════════
const ANSWERS: DiscoveryAnswers = {
  status: 0,
  interests: [5, 0], // art & design; building things
  environment: 1, // building things people use
  strength: 2, // creative ideas
  vision: 3, // creating things that exist
  field: 'Computer Science',
};

async function discoveryTests() {
  section('Discovery scoring');

  // Every answer has to move the needle — the original bug was that only
  // question 3 mattered and two questions were read by nothing at all.
  const base = scoreSectors(ANSWERS);
  ok('creative-leaning answers score Creative highest', topSector(ANSWERS) === 'Creative');

  const swapStrength = scoreSectors({ ...ANSWERS, strength: 1 }); // analytical
  ok(
    'changing strength changes the score',
    JSON.stringify(base) !== JSON.stringify(swapStrength),
  );

  const swapVision = scoreSectors({ ...ANSWERS, vision: 0 }); // run my own company
  ok('changing vision changes the score', JSON.stringify(base) !== JSON.stringify(swapVision));

  const swapInterests = scoreSectors({ ...ANSWERS, interests: [1] }); // numbers & data
  ok(
    'changing interests changes the score',
    JSON.stringify(base) !== JSON.stringify(swapInterests),
  );

  ok(
    'an analytical profile lands on Technology or Finance',
    ['Technology', 'Finance'].includes(
      topSector({ status: 2, interests: [1, 6], environment: 0, strength: 1, vision: 4 }),
    ),
  );
  ok(
    'a leadership profile lands on Entrepreneurship',
    topSector({ status: 2, interests: [4, 7], environment: 3, strength: 4, vision: 0 }) ===
      'Entrepreneurship',
  );

  ok('describeAnswers includes every question', describeAnswers(ANSWERS).split('\n').length === 6);
  ok('describeAnswers uses answer text, not indices', describeAnswers(ANSWERS).includes(INTEREST_OPTIONS[5].label));

  section('Answer validation');

  ok('valid answers accepted', DiscoveryAnswersSchema.safeParse(ANSWERS).success);
  ok(
    'out-of-range index rejected',
    !DiscoveryAnswersSchema.safeParse({ ...ANSWERS, environment: 99 }).success,
  );
  ok(
    'negative index rejected',
    !DiscoveryAnswersSchema.safeParse({ ...ANSWERS, status: -1 }).success,
  );
  ok(
    'empty interests rejected',
    !DiscoveryAnswersSchema.safeParse({ ...ANSWERS, interests: [] }).success,
  );
  ok(
    'duplicate interests rejected',
    !DiscoveryAnswersSchema.safeParse({ ...ANSWERS, interests: [1, 1] }).success,
  );
  ok('missing field rejected', !DiscoveryAnswersSchema.safeParse({ status: 0 }).success);
  ok(
    'overlong field rejected',
    !DiscoveryAnswersSchema.safeParse({ ...ANSWERS, field: 'x'.repeat(200) }).success,
  );

  section('Model output parsing');

  const valid = JSON.stringify(generateMockMatch(ANSWERS));

  ok('plain JSON parses', parseCareerMatch(valid).ok);
  ok('fenced JSON parses', parseCareerMatch('```json\n' + valid + '\n```').ok);
  ok('JSON with leading prose parses', parseCareerMatch('Sure! Here you go:\n' + valid).ok);
  ok(
    'JSON with trailing prose parses',
    parseCareerMatch(valid + '\n\nHope that helps!').ok,
  );
  ok('non-JSON rejected', !parseCareerMatch('I cannot help with that.').ok);
  ok('empty string rejected', !parseCareerMatch('').ok);
  ok('truncated JSON rejected', !parseCareerMatch(valid.slice(0, valid.length / 2)).ok);
  ok(
    'wrong sector rejected',
    !parseCareerMatch(valid.replace(/"sector":"[^"]+"/, '"sector":"Healthcare"')).ok,
  );
  ok(
    'missing roadmap rejected',
    !parseCareerMatch(JSON.stringify({ primary: { title: 'x' }, secondary: [] })).ok,
  );
  eq('extractJson unwraps a fence', extractJson('```json\n{"a":1}\n```'), { a: 1 });

  section('Offline provider');

  const mock = generateMockMatch(ANSWERS);
  ok('mock output satisfies the contract', CareerMatchSchema.safeParse(mock).success);
  ok('mock is deterministic', JSON.stringify(generateMockMatch(ANSWERS)) === JSON.stringify(mock));
  ok('mock sector matches the score', mock.primary.sector === topSector(ANSWERS));
  ok('mock why quotes the student\'s field', mock.primary.why.includes('Computer Science'));
  ok(
    'mock why reflects a chosen interest',
    mock.primary.why.toLowerCase().includes(INTEREST_OPTIONS[5].label.toLowerCase()),
  );
  ok(
    'a different profile yields a different match',
    generateMockMatch({ status: 2, interests: [1], environment: 2, strength: 3, vision: 2 })
      .primary.title !== mock.primary.title,
  );

  section('Provider resolution');

  ok('defaults to mock', resolveProvider({}).name === 'mock');
  ok('explicit mock resolves', resolveProvider({ AI_PROVIDER: 'mock' }).name === 'mock');
  ok(
    'openai-compatible without config throws',
    (() => {
      try {
        resolveProvider({ AI_PROVIDER: 'openai-compatible' });
        return false;
      } catch (e) {
        return e instanceof ProviderConfigError;
      }
    })(),
  );
  ok(
    'openai-compatible with config resolves and labels by host',
    resolveProvider({
      AI_PROVIDER: 'openai-compatible',
      AI_BASE_URL: 'https://api.groq.com/openai/v1',
      AI_MODEL: 'llama-3.3-70b',
      AI_API_KEY: 'k',
    }).name === 'api.groq.com',
  );
  ok(
    'unknown provider throws',
    (() => {
      try {
        resolveProvider({ AI_PROVIDER: 'telepathy' });
        return false;
      } catch {
        return true;
      }
    })(),
  );

  section('Retry and fallback');

  const signal = new AbortController().signal;

  // A model that fails once, then complies: the repair retry must recover it.
  let calls = 0;
  const flaky = createLlmProvider({
    name: 'flaky',
    model: 'test',
    complete: async () => {
      calls++;
      return calls === 1 ? 'I am not going to give you JSON.' : valid;
    },
  });
  const recovered = await flaky.generate(ANSWERS, signal);
  ok('retry recovers from one bad response', !!recovered.primary.title);
  eq('retry used exactly two attempts', calls, 2);

  // A model that never complies must give up rather than loop.
  const broken = createLlmProvider({
    name: 'broken',
    model: 'test',
    complete: async () => 'nope',
  });
  await rejects('a permanently bad model throws', () => broken.generate(ANSWERS, signal));

  // Orchestration must never fail the student.
  const down = {
    name: 'down',
    model: 'test',
    generate: async () => {
      throw new Error('connection refused');
    },
  };
  const fellBack = await generateDiscovery(ANSWERS, { provider: down });
  ok('a dead provider falls back instead of throwing', fellBack.usedFallback === true);
  ok('fallback still returns a valid result', CareerMatchSchema.safeParse(fellBack.result).success);
  ok('fallback records provenance as mock', fellBack.provider === 'mock');
  ok('fallback reason is captured', (fellBack.fallbackReason ?? '').includes('connection refused'));

  const misconfigured = await generateDiscovery(ANSWERS, {
    env: { AI_PROVIDER: 'openai-compatible' },
  });
  ok('misconfiguration falls back rather than 500s', misconfigured.usedFallback === true);

  await rejects('throwOnFailure surfaces the error', () =>
    generateDiscovery(ANSWERS, { provider: down, throwOnFailure: true }),
  );

  const good = await generateDiscovery(ANSWERS, { env: { AI_PROVIDER: 'mock' } });
  ok('a healthy provider reports no fallback', good.usedFallback === false);
  ok('latency is recorded', typeof good.latencyMs === 'number' && good.latencyMs >= 0);
}

// ═══════════════════════════════════════════════════════════════════════════
async function dataLayerTests() {
  section('Error taxonomy');

  // A lost race is the client's cue to refresh slots, not a server fault.
  eq('SLOT_TAKEN maps to 409', STATUS_FOR_CODE.SLOT_TAKEN, 409);
  eq('SLOT_UNAVAILABLE maps to 409', STATUS_FOR_CODE.SLOT_UNAVAILABLE, 409);
  // 404, not 403 — a non-participant must not learn the booking exists.
  eq('NOT_A_PARTICIPANT maps to 404', STATUS_FOR_CODE.NOT_A_PARTICIPANT, 404);
  eq('INVALID_ID maps to 400', STATUS_FOR_CODE.INVALID_ID, 400);
  eq(
    'an unknown error maps to 500',
    statusForError(new Error('boom')),
    500,
  );
  eq(
    'a DataError maps by its code',
    statusForError(new DataError('MENTOR_NOT_FOUND', 'x')),
    404,
  );
  ok(
    'every code has a status',
    Object.values(STATUS_FOR_CODE).every((s) => s >= 400 && s < 600),
  );

  section('Duplicate-key detection');

  // This is how the double-booking guarantee reaches application code.
  ok('detects driver code 11000', isDuplicateKeyError({ code: 11000 }));
  ok('detects code 11001', isDuplicateKeyError({ code: 11001 }));
  ok('detects a wrapped cause', isDuplicateKeyError({ cause: { code: 11000 } }));
  ok('ignores an unrelated error', !isDuplicateKeyError(new Error('network')));
  ok('ignores a validation error code', !isDuplicateKeyError({ code: 121 }));
  ok('survives null', !isDuplicateKeyError(null));
  ok('survives a string', !isDuplicateKeyError('11000'));

  section('Slot occupancy');

  ok('pending occupies the slot', occupiesSlot('pending'));
  ok('confirmed occupies the slot', occupiesSlot('confirmed'));
  ok('completed still occupies it', occupiesSlot('completed'));
  ok('no_show still occupies it', occupiesSlot('no_show'));
  ok('cancelled releases it', !occupiesSlot('cancelled'));

  section('DTO serialisation');

  const oid = new mongoose.Types.ObjectId();
  const mentorDoc = {
    _id: oid,
    user: new mongoose.Types.ObjectId(),
    displayName: 'Zainab Mensah',
    initials: 'ZM',
    role: 'Creative Director',
    company: 'Freelance',
    sector: 'Creative',
    experience: 8,
    focus: ['Art direction'],
    tags: ['Brand'],
    bio: 'b',
    helpWith: [],
    timezone: 'Africa/Lagos',
    vetted: true,
    ratingAvg: 4.9,
    ratingCount: 20,
    sessionCount: 36,
  };

  const mentorDto = toMentorDTO(mentorDoc);
  ok('mentor id is a string', typeof mentorDto.id === 'string');
  ok('mentor DTO is JSON-serialisable', JSON.parse(JSON.stringify(mentorDto)).id === String(oid));
  ok(
    'mentor DTO carries no ObjectId',
    !JSON.stringify(mentorDto).includes('ObjectId') && !('user' in mentorDto),
  );
  ok('acceptingBookings defaults true when absent', mentorDto.acceptingBookings === true);

  const bookingDto = toBookingDTO({
    _id: new mongoose.Types.ObjectId(),
    student: new mongoose.Types.ObjectId(),
    mentor: mentorDoc,
    topic: 'Product career review',
    startsAt: new Date('2026-09-07T08:00:00Z'),
    endsAt: new Date('2026-09-07T08:45:00Z'),
    status: 'confirmed',
    notes: [
      { body: 'note', author: new mongoose.Types.ObjectId(), createdAt: new Date('2026-09-07T08:10:00Z') },
    ],
  });
  ok('dates become ISO strings', bookingDto.startsAt === '2026-09-07T08:00:00.000Z');
  ok(
    'a populated mentor becomes a nested DTO',
    typeof bookingDto.mentor === 'object' && bookingDto.mentor.displayName === 'Zainab Mensah',
  );
  ok('note authors become strings', typeof bookingDto.notes[0].author === 'string');
  ok(
    'booking DTO survives a JSON round trip',
    JSON.parse(JSON.stringify(bookingDto)).topic === 'Product career review',
  );

  const unpopulated = toBookingDTO({
    _id: new mongoose.Types.ObjectId(),
    student: new mongoose.Types.ObjectId(),
    mentor: oid,
    topic: 't',
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 1000),
    status: 'pending',
    notes: [],
  });
  ok('an unpopulated mentor stays an id string', unpopulated.mentor === String(oid));

  const opp = toOpportunityDTO({
    _id: new mongoose.Types.ObjectId(),
    title: 'x',
    organisation: 'y',
    type: 'Fellowship',
    sector: 'Technology',
    description: 'd',
    url: '#',
    deadline: null,
  });
  ok('a rolling deadline serialises as null', opp.deadline === null);
}

// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  await timezoneTests();
  await slotTests();
  await schemaTests();
  await discoveryTests();
  await dataLayerTests();

  console.log(`\n${'═'.repeat(62)}`);
  console.log(failed === 0 ? `ALL ${passed} CHECKS PASSED` : `${passed} passed, ${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

void group;
main();
