import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { recordConsent } from '@/lib/db/queries/accounts';
import { DataError, statusForError } from '@/lib/db/queries/errors';
import { CONSENT_VERSION } from '@/lib/research/consent';

export const dynamic = 'force-dynamic';

/**
 * POST /api/consent: the signed-in student agrees to the research consent.
 * The version they saw must match the current one, so nobody is recorded as
 * agreeing to wording they were never shown.
 */
const ConsentSchema = z.object({
  agree: z.literal(true),
  version: z.string(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const parsed = ConsentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please tick the box to agree.' }, { status: 422 });
  }
  if (parsed.data.version !== CONSENT_VERSION) {
    return NextResponse.json(
      { error: 'The consent wording has changed. Reload the page to read the current version.' },
      { status: 409 },
    );
  }

  try {
    const status = await recordConsent(session.user.id, CONSENT_VERSION);
    return NextResponse.json({ participantCode: status.participantCode });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[consent] failed:', err);
    return NextResponse.json({ error: 'Could not save your consent.' }, { status: 500 });
  }
}
