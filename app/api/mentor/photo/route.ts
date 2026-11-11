import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guard';
import { removePhoto, savePhoto, startPhotoUpload } from '@/lib/db/queries/mentorConsole';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

/**
 * The signed-in mentor's headshot.
 *
 *   POST    a signed permission to upload the photo straight to Cloudinary
 *   PUT     { version }  record the photo just uploaded
 *   DELETE  remove the photo
 */

function fail(err: unknown, what: string) {
  if (err instanceof DataError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
  }
  console.error(`[mentor] photo ${what} failed:`, err);
  return NextResponse.json({ error: 'Something went wrong with your photo. Please try again.' }, { status: 500 });
}

export async function POST() {
  const guard = await requireRole('mentor');
  if ('response' in guard) return guard.response;
  try {
    return NextResponse.json(await startPhotoUpload(guard.userId));
  } catch (err) {
    return fail(err, 'signing');
  }
}

export async function PUT(request: Request) {
  const guard = await requireRole('mentor');
  if ('response' in guard) return guard.response;
  const body = (await request.json().catch(() => null)) as { version?: unknown } | null;
  try {
    return NextResponse.json({ photo: await savePhoto(guard.userId, body?.version) });
  } catch (err) {
    return fail(err, 'saving');
  }
}

export async function DELETE() {
  const guard = await requireRole('mentor');
  if ('response' in guard) return guard.response;
  try {
    await removePhoto(guard.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, 'removal');
  }
}
