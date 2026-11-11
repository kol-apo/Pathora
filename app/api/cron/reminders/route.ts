import { NextResponse } from 'next/server';
import { sendReminders } from '@/lib/db/queries/notifications';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/cron/reminders — email both people about each confirmed session in
 * the next 24 hours. Run daily by Vercel Cron, which sends
 * `Authorization: Bearer <CRON_SECRET>`; anything else is refused.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }
  return NextResponse.json(await sendReminders());
}
