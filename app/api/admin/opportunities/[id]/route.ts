import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guard';
import { hideOpportunity } from '@/lib/db/queries/opportunities';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

/** DELETE /api/admin/opportunities/:id  Take a listing down. Admins only. */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const guard = await requireRole('admin');
  if ('response' in guard) return guard.response;
  try {
    await hideOpportunity(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[admin] hide opportunity failed:', err);
    return NextResponse.json({ error: 'Could not take it down.' }, { status: 500 });
  }
}
