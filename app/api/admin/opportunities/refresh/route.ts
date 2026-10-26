import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guard';
import { refreshOpportunities } from '@/lib/db/queries/opportunities';

export const dynamic = 'force-dynamic';
// Waits on the AI model or on publishers' feeds; Vercel's default limit is 10 seconds.
export const maxDuration = 60;

/** POST /api/admin/opportunities/refresh  Read the feeds now. Admins only. */
export async function POST() {
  const guard = await requireRole('admin');
  if ('response' in guard) return guard.response;
  const reports = await refreshOpportunities();
  return NextResponse.json({ reports });
}
