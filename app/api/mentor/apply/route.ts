import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { applyAsMentor } from '@/lib/db/queries/mentorConsole';
import { DataError, statusForError } from '@/lib/db/queries/errors';
import { SECTORS } from '@/lib/types';
import { cleanProfileLinks } from '@/lib/profileLinks';

export const dynamic = 'force-dynamic';

const list = (max: number) => z.array(z.string().trim().min(1).max(80)).max(max);

const ApplicationSchema = z.object({
  role: z.string().trim().min(2, 'Enter your job title.').max(80),
  company: z.string().trim().min(1, 'Enter where you work, or "Freelance".').max(80),
  sector: z.enum(SECTORS as [string, ...string[]]),
  country: z.string().trim().min(2, 'Enter your country.').max(60),
  timezone: z.string().min(3),
  experience: z.coerce.number().int().min(1, 'Enter your years of experience.').max(60),
  bio: z.string().trim().min(80, 'Write at least 80 characters about yourself.').max(1200),
  focus: list(3).min(1, 'Add at least one focus area.'),
  tags: list(10),
  helpWith: list(6).min(1, 'Add at least one thing you can help with.'),
  codeOfConductOk: z.literal(true, { message: 'Please agree to the code of conduct.' }),
  socials: z.object({ linkedin: z.string().max(300).optional(), x: z.string().max(300).optional() }).optional(),
  links: z
    .array(z.object({ kind: z.string(), url: z.string().max(500), title: z.string().max(200).optional() }))
    .max(10)
    .optional(),
});

/** POST /api/mentor/apply  Submit a mentor application for the signed-in account. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const parsed = ApplicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Check the form.', field: first?.path.join('.') }, { status: 422 });
  }

  const links = cleanProfileLinks({ socials: parsed.data.socials, links: parsed.data.links });
  if (!links.ok) return NextResponse.json({ error: links.error, field: 'links' }, { status: 422 });

  try {
    const result = await applyAsMentor(session.user.id, { ...parsed.data, ...links.value } as never);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[mentor] apply failed:', err);
    return NextResponse.json({ error: 'Could not submit your application.' }, { status: 500 });
  }
}
