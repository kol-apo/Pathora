import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { syncVideoSession } from '@/lib/db/queries/video';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions/:id/leave — after someone leaves, record the call's
 * timing from Daily's own meeting records. Safe to call more than once.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  try {
    return NextResponse.json(await syncVideoSession(params.id, session.user.id));
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[video] sync failed:', err);
    return NextResponse.json({ error: 'Could not record the call.' }, { status: 500 });
  }
}
