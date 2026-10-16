import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, googleEnabled } from '@/auth';
import AuthShell from '@/components/auth/AuthShell';
import { SignUpForm } from '@/components/auth/AuthForms';
import { safeReturnPath } from '@/components/auth/messages';

export const metadata = { title: 'Create your account · Pathora' };

export default async function SignUpPage({ searchParams }: { searchParams: { next?: string } }) {
  // New students go to consent next; a would-be mentor goes back to apply.
  const next = safeReturnPath(searchParams.next, '/welcome');
  if ((await auth())?.user) redirect(next === '/welcome' ? '/dashboard' : next);

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free for students. Find your direction, then talk to someone already working in it."
      footer={
        <>
          Already have an account?{' '}
          <Link
            href={next === '/welcome' ? '/signin' : `/signin?callbackUrl=${encodeURIComponent(next)}`}
            className="font-medium text-navy underline underline-offset-2"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm googleEnabled={googleEnabled} next={next} />
    </AuthShell>
  );
}
