import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { bookingStudyDetails } from '@/lib/db/queries/bookings';
import { FEEDBACK_MAX_CHARS, rateSession } from '@/lib/db/queries/feedback';
import { DataError, statusForError } from '@/lib/db/queries/errors';
import { logStudentEvent } from '@/lib/db/queries/research';

export const dynamic = 'force-dynamic';

const RatingSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().max(FEEDBACK_MAX_CHARS).optional(),
});

/**
 * POST /api/bookings/:id/rate — the signed-in student rates one of their own
 * sessions once it has ended. Once only.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (session.user.role !== 'student') {
    return NextResponse.json({ error: 'Only students rate their sessions.' }, { status: 403 });
  }

  const parsed = RatingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Choose between 1 and 5 stars.' }, { status: 422 });
  }

  try {
    const booking = await rateSession(params.id, session.user.id, parsed.data);
    const details = await bookingStudyDetails(booking).catch(() => null);
    if (details) {
      await logStudentEvent(session.user.id, {
        type: 'session_rated',
        payload: {
          sector: details.sector,
          viaBridge: details.viaBridge,
          score: parsed.data.score,
          withComment: !!parsed.data.comment?.trim(),
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[bookings] rating failed:', err);
    return NextResponse.json({ error: 'Could not save your feedback.' }, { status: 500 });
  }
}
