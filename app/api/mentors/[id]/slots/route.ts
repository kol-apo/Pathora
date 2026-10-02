import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listAvailableSlots } from '@/lib/db/queries';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: 'from and to must be valid dates.' }, { status: 400 });
  }
  if (parsed.data.from && parsed.data.to && parsed.data.from > parsed.data.to) {
    return NextResponse.json({ error: '`from` must precede `to`.' }, { status: 400 });
  }

  try {
    const slots = await listAvailableSlots(params.id, {
      from: parsed.data.from,
      to: parsed.data.to,
    });
    return NextResponse.json({ slots });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[slots] failed:', err);
    return NextResponse.json({ error: 'Could not load availability.' }, { status: 500 });
  }
}
