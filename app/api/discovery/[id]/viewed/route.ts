import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { getDiscoveryResultForStudent } from '@/lib/db/queries/access';
import { markRecommendationViewed } from '@/lib/db/queries/bridge';
import { DataError, statusForError } from '@/lib/db/queries/errors';
import { logStudentEvent } from '@/lib/db/queries/research';

export const dynamic = 'force-dynamic';

const ViewedSchema = z.object({ mentorId: z.string().min(1) });

/**
 * POST /api/discovery/:id/viewed — the student opened the profile of a mentor
 * surfaced on their result. The second step of the bridge funnel. Only the
 * result's owner can record a view, and only the first view counts.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Sign in as a student.' }, { status: 401 });
  }

  const parsed = ViewedSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'mentorId is required.' }, { status: 422 });
  }

  const result = await getDiscoveryResultForStudent(params.id, session.user.id);
  if (!result) return NextResponse.json({ error: 'No such discovery result.' }, { status: 404 });

  try {
    const rank = await markRecommendationViewed(params.id, parsed.data.mentorId);
    if (rank === null) {
      return NextResponse.json({ error: 'This mentor was not recommended on that result.' }, { status: 404 });
    }
    await logStudentEvent(session.user.id, {
      type: 'bridge_profile_viewed',
      payload: { sector: result.primary.sector, rank },
    });
    return NextResponse.json({ rank });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[discovery] could not record view:', err);
    return NextResponse.json({ error: 'Could not record the view.' }, { status: 500 });
  }
}
