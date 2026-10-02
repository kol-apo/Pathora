import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listMentors, type MentorSort } from '@/lib/db/queries';
import { statusForError } from '@/lib/db/queries/errors';
import { SECTORS } from '@/lib/types';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  sector: z.enum(['All', ...SECTORS] as [string, ...string[]]).optional(),
  q: z.string().trim().max(120).optional(),
  sort: z.enum(['experience', 'rating', 'booked']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  skip: z.coerce.number().int().min(0).optional(),
});

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = QuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid query.',
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400 },
    );
  }

  try {
    const { mentors, total } = await listMentors({
      sector: parsed.data.sector as never,
      query: parsed.data.q,
      sort: parsed.data.sort as MentorSort | undefined,
      limit: parsed.data.limit,
      skip: parsed.data.skip,
    });
    return NextResponse.json({ mentors, total });
  } catch (err) {
    console.error('[mentors] list failed:', err);
    return NextResponse.json({ error: 'Could not load consultants.' }, { status: statusForError(err) });
  }
}
