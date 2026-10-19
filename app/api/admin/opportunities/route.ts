import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/guard';
import { addOpportunity } from '@/lib/db/queries/opportunities';
import { DataError, statusForError } from '@/lib/db/queries/errors';
import { MANUAL_SOURCES, OPPORTUNITY_TYPES } from '@/lib/opportunities/sources';
import { SECTORS } from '@/lib/types';

export const dynamic = 'force-dynamic';

const AddSchema = z.object({
  title: z.string().trim().min(3).max(290),
  organisation: z.string().trim().max(200).optional(),
  type: z.enum(OPPORTUNITY_TYPES),
  sector: z.enum(SECTORS as [string, ...string[]]).nullable(),
  description: z.string().trim().max(600).optional(),
  url: z.string().trim().url(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  source: z.enum(MANUAL_SOURCES as [string, ...string[]]),
});

/** POST /api/admin/opportunities  Add a listing by hand (e.g. from ALU SPD). Admins only. */
export async function POST(request: Request) {
  const guard = await requireRole('admin');
  if ('response' in guard) return guard.response;

  const parsed = AddSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Check the title, link and type.' }, { status: 422 });
  }
  const d = parsed.data;
  try {
    const opportunity = await addOpportunity({
      ...d,
      sector: (d.sector as (typeof SECTORS)[number] | null) ?? null,
      source: d.source as (typeof MANUAL_SOURCES)[number],
      deadline: d.deadline ? new Date(`${d.deadline}T23:59:00Z`) : null,
    });
    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[admin] add opportunity failed:', err);
    return NextResponse.json({ error: 'Could not add the opportunity.' }, { status: 500 });
  }
}
