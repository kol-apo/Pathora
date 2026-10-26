import { NextResponse } from 'next/server';
import { refreshOpportunities } from '@/lib/db/queries/opportunities';

export const dynamic = 'force-dynamic';
// Waits on the AI model or on publishers' feeds; Vercel's default limit is 10 seconds.
export const maxDuration = 60;

/**
 * GET /api/cron/opportunities — read the opportunity feeds. For a scheduler
 * (Vercel Cron), which sends `Authorization: Bearer <CRON_SECRET>`. Without
 * that secret configured, the endpoint refuses everything.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }
  const reports = await refreshOpportunities();
  return NextResponse.json({ reports });
}
