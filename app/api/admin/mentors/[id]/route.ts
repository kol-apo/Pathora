import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/guard';
import { reviewMentor } from '@/lib/db/queries/admin';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

const ReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend', 'reinstate']),
  profileVector: z.array(z.number().min(0).max(1)).length(5).optional(),
});

/** POST /api/admin/mentors/:id  Approve, reject, suspend or reinstate a mentor. Admins only. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const guard = await requireRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = ReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid review request.' }, { status: 422 });
  }

  try {
    const mentor = await reviewMentor({ mentorId: params.id, adminUserId: guard.userId, ...parsed.data });
    return NextResponse.json({ mentor });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[admin] review failed:', err);
    return NextResponse.json({ error: 'Could not update the mentor.' }, { status: 500 });
  }
}
