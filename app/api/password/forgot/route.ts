import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appUrl } from '@/lib/appUrl';
import { requestPasswordReset } from '@/lib/db/queries/passwords';

export const dynamic = 'force-dynamic';

const ForgotSchema = z.object({ email: z.string().trim().email().max(200) });

/**
 * POST /api/password/forgot — email a reset link. The answer is the same
 * whether or not the email has an account, so addresses cannot be probed.
 */
export async function POST(request: Request) {
  const parsed = ForgotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 422 });

  const site = appUrl(request);
  if (!site) {
    console.error('[password] APP_URL is not set, so reset links cannot be built.');
    return NextResponse.json({ error: 'Password resets are not set up yet. Please try again later.' }, { status: 503 });
  }
  try {
    await requestPasswordReset(parsed.data.email, site);
  } catch (err) {
    // Logged, but the student sees the same answer as for a success.
    console.error('[password] reset request failed:', err);
  }
  return NextResponse.json({ ok: true });
}
