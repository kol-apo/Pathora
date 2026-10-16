import { NextResponse } from 'next/server';
import { z } from 'zod';
import { registerStudent } from '@/lib/db/queries/accounts';
import { DataError, statusForError } from '@/lib/db/queries/errors';

export const dynamic = 'force-dynamic';

/**
 * POST /api/register: create a student account with email and password.
 * The browser then signs in with the same details.
 */
const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  email: z.string().trim().email('Enter a valid email address.').max(200),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(200)
    .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Use at least one letter and one number.'),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON.' }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? 'Check your details.', field: first?.path.join('.') },
      { status: 422 },
    );
  }

  try {
    const account = await registerStudent(parsed.data);
    return NextResponse.json({ id: account.id }, { status: 201 });
  } catch (err) {
    if (err instanceof DataError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusForError(err) });
    }
    console.error('[register] failed:', err);
    return NextResponse.json({ error: 'Could not create the account.' }, { status: 500 });
  }
}
