import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/guard';
import { respondToBooking } from '@/lib/db/queries/mentorConsole';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

const ResponseSchema = z.object({ action: z.enum(['confirm', 'decline']) });

/** POST /api/mentor/bookings/:id  Confirm or decline one of the mentor's own booking requests. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const guard = await requireRole('mentor');
  if ('response' in guard) return guard.response;

  const parsed = ResponseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action.' }, { status: 422 });

  try {
    await respondToBooking(guard.userId, params.id, parsed.data.action);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[mentor] booking response failed:', err);
    return NextResponse.json({ error: 'Could not update the booking.' }, { status: 500 });
  }
}
