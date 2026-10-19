import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { bookingStudyDetails, cancelBookingForStudent } from '@/lib/db/queries/bookings';
import { DataError, statusForError } from '@/lib/db/queries/errors';
import { logStudentEvent } from '@/lib/db/queries/research';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings/:id/cancel — the signed-in student cancels one of their
 * own sessions before it starts. The slot opens for other students at once.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }
  if (session.user.role !== 'student') {
    return NextResponse.json({ error: 'Only students cancel their own sessions here.' }, { status: 403 });
  }

  try {
    const booking = await cancelBookingForStudent(params.id, session.user.id);
    const details = await bookingStudyDetails(booking).catch(() => null);
    if (details) {
      await logStudentEvent(session.user.id, {
        type: 'booking_cancelled',
        payload: {
          sector: details.sector,
          viaBridge: details.viaBridge,
          hoursBeforeStart: Math.round((new Date(booking.startsAt).getTime() - Date.now()) / 3_600_000),
        },
      });
    }
    return NextResponse.json({ booking });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[bookings] cancel failed:', err);
    return NextResponse.json({ error: 'Could not cancel the session.' }, { status: 500 });
  }
}
