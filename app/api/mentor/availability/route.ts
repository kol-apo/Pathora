import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/guard';
import { updateMyAvailability } from '@/lib/db/queries/mentorConsole';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

const Minute = z.number().int().min(0).max(1440);

const AvailabilitySchema = z.object({
  acceptingBookings: z.boolean(),
  weekly: z
    .array(z.object({ dayOfWeek: z.number().int().min(0).max(6), startMinute: Minute, endMinute: Minute }))
    .max(28),
  // Specific calendar dates: a day off, or that day's own hours.
  dates: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        blocked: z.boolean(),
        windows: z.array(z.object({ startMinute: Minute, endMinute: Minute })).max(4),
      }),
    )
    .max(120)
    .optional(),
});

/**
 * PUT /api/mentor/availability  Replace the signed-in mentor's weekly hours
 * and, when `dates` is sent, their date-specific hours.
 */
export async function PUT(request: Request) {
  const guard = await requireRole('mentor');
  if ('response' in guard) return guard.response;

  const parsed = AvailabilitySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid hours.' }, { status: 422 });

  try {
    await updateMyAvailability(guard.userId, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[mentor] availability failed:', err);
    return NextResponse.json({ error: 'Could not save your hours.' }, { status: 500 });
  }
}
