import { NextResponse } from 'next/server';
import { getMentor } from '@/lib/db/queries';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const mentor = await getMentor(params.id);
    // Unvetted profiles are hidden from students, the same rule /explore uses.
    if (!mentor || !mentor.vetted) {
      return NextResponse.json({ error: 'No such consultant.' }, { status: 404 });
    }
    return NextResponse.json({ mentor });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[mentor] get failed:', err);
    return NextResponse.json({ error: 'Could not load this consultant.' }, { status: 500 });
  }
}
