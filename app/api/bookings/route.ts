import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createBooking, listBookingsForStudent } from '@/lib/db/queries';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

/**
 * TEMPORARY: identity comes from the request until auth exists.
 *
 * Trusting a client-supplied studentId is not acceptable in production — it
 * would let anyone book as anyone. Replace this single function with a session
 * lookup when Auth.js lands; nothing else in this file changes.
 */
function resolveStudentId(body: { studentId?: string }): string | null {
  return body.studentId ?? null;
}

const CreateSchema = z.object({
  studentId: z.string().min(1),
  mentorId: z.string().min(1),
  startsAt: z.coerce.date(),
  topic: z.string().trim().min(1).max(200),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid booking request.',
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 422 },
    );
  }

  const studentId = resolveStudentId(parsed.data);
  if (!studentId) {
    return NextResponse.json({ error: 'Sign in to book a session.' }, { status: 401 });
  }

  try {
    const booking = await createBooking({
      studentId,
      mentorId: parsed.data.mentorId,
      startsAt: parsed.data.startsAt,
      topic: parsed.data.topic,
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      // SLOT_TAKEN and SLOT_UNAVAILABLE are 409s the UI should handle by
      // refreshing the slot list, not by showing a generic failure.
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusForError(err) },
      );
    }
    console.error('[bookings] create failed:', err);
    return NextResponse.json({ error: 'Could not create the booking.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const studentId = new URL(request.url).searchParams.get('studentId');
  if (!studentId) {
    return NextResponse.json({ error: 'Sign in to see your sessions.' }, { status: 401 });
  }

  try {
    const bookings = await listBookingsForStudent(studentId, { upcomingOnly: true });
    return NextResponse.json({ bookings });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[bookings] list failed:', err);
    return NextResponse.json({ error: 'Could not load sessions.' }, { status: 500 });
  }
}
