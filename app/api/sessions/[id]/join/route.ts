import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { joinVideoSession } from '@/lib/db/queries/video';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sessions/:id/join — the booking's student or mentor gets the
 * room address and their own meeting token. Anyone else: 404.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  try {
    const { roomUrl, token } = await joinVideoSession(params.id, session.user.id);
    return NextResponse.json({ roomUrl, token });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[video] join failed:', err);
    return NextResponse.json({ error: 'Could not open the call. Please try again.' }, { status: 500 });
  }
}
