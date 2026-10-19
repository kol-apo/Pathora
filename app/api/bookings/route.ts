import { NextResponse } from 'next/server';
import { z } from 'zod';
import { bookingStudyDetails, createBooking, listBookingsForStudent, logStudentEvent } from '@/lib/db/queries';
import { DataError, statusForError } from '@/lib/db/queries/errors';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * The signed-in student's id, from the session. Identity never comes from the
 * request body: that would let anyone book as anyone.
 */
async function signedInStudent(): Promise<{ id: string } | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Sign in to book a session.' }, { status: 401 }) };
  }
  if (session.user.role !== 'student') {
    return {
      error: NextResponse.json({ error: 'Only student accounts can book sessions.' }, { status: 403 }),
    };
  }
  return { id: session.user.id };
}

const CreateSchema = z.object({
  mentorId: z.string().min(1),
  startsAt: z.coerce.date(),
  topic: z.string().trim().min(1).max(200),
  /** Set when the student came from one of the three mentors on their result. */
  discoveryResultId: z.string().min(1).optional(),
  viaBridge: z.boolean().optional(),
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

  const student = await signedInStudent();
  if ('error' in student) return student.error;

  try {
    // createBooking checks the result belongs to this student and that the
    // mentor was surfaced on it; the request alone proves nothing.
    const booking = await createBooking({
      studentId: student.id,
      mentorId: parsed.data.mentorId,
      startsAt: parsed.data.startsAt,
      topic: parsed.data.topic,
      discoveryResultId: parsed.data.discoveryResultId,
      viaBridge: parsed.data.viaBridge === true,
    });
    // The booking is made; a research-log failure must not turn it into an error.
    const details = await bookingStudyDetails(booking).catch(() => null);
    if (details) await logStudentEvent(student.id, { type: 'booking_requested', payload: details });
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

export async function GET() {
  const student = await signedInStudent();
  if ('error' in student) return student.error;

  try {
    const bookings = await listBookingsForStudent(student.id, { upcomingOnly: true });
    return NextResponse.json({ bookings });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[bookings] list failed:', err);
    return NextResponse.json({ error: 'Could not load sessions.' }, { status: 500 });
  }
}
