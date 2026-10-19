import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { deleteAccount } from '@/lib/db/queries/accountDeletion';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

const DeleteSchema = z.object({
  /** Typed by the person, so nobody deletes an account with a stray click. */
  confirm: z.literal('DELETE'),
  password: z.string().max(200).nullable(),
});

/**
 * POST /api/account/delete — withdraw from the study and delete the signed-in
 * account with everything linked to it. Cannot be undone.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const parsed = DeleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 422 });

  try {
    const report = await deleteAccount(session.user.id, parsed.data.password);
    return NextResponse.json({ deleted: true, report });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[account] delete failed:', err);
    return NextResponse.json({ error: 'Could not finish deleting the account. Please try again; it picks up where it stopped.' }, { status: 500 });
  }
}
