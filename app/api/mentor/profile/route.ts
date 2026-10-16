import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/guard';
import { updateMyLinks } from '@/lib/db/queries/mentorConsole';
import { DataError, statusForError } from '@/lib/db/queries/errors';
import { cleanProfileLinks } from '@/lib/profileLinks';

export const dynamic = 'force-dynamic';

const LinksSchema = z.object({
  socials: z.object({ linkedin: z.string().max(300).optional(), x: z.string().max(300).optional() }),
  links: z.array(z.object({ kind: z.string(), url: z.string().max(500), title: z.string().max(200).optional() })).max(10),
});

/** PUT /api/mentor/profile  Replace the signed-in mentor's LinkedIn, X and other links. */
export async function PUT(request: Request) {
  const guard = await requireRole('mentor');
  if ('response' in guard) return guard.response;

  const parsed = LinksSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid links.' }, { status: 422 });

  const cleaned = cleanProfileLinks(parsed.data);
  if (!cleaned.ok) return NextResponse.json({ error: cleaned.error }, { status: 422 });

  try {
    await updateMyLinks(guard.userId, cleaned.value);
    return NextResponse.json(cleaned.value);
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[mentor] links failed:', err);
    return NextResponse.json({ error: 'Could not save your links.' }, { status: 500 });
  }
}
