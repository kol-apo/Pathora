import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guard';
import { refreshOpportunities } from '@/lib/db/queries/opportunities';

export const dynamic = 'force-dynamic';

/** POST /api/admin/opportunities/refresh  Read the feeds now. Admins only. */
export async function POST() {
  const guard = await requireRole('admin');
  if ('response' in guard) return guard.response;
  const reports = await refreshOpportunities();
  return NextResponse.json({ reports });
}
