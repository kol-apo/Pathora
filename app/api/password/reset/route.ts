import { NextResponse } from 'next/server';
import { z } from 'zod';
import { PasswordSchema } from '@/lib/auth/password';
import { resetPassword } from '@/lib/db/queries/passwords';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

const ResetSchema = z.object({ token: z.string().min(20).max(200), password: PasswordSchema });

/** POST /api/password/reset — set a new password from an emailed link. */
export async function POST(request: Request) {
  const parsed = ResetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Check your new password.' }, { status: 422 });
  }
  try {
    await resetPassword(parsed.data.token, parsed.data.password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[password] reset failed:', err);
    return NextResponse.json({ error: 'Could not change your password.' }, { status: 500 });
  }
}
