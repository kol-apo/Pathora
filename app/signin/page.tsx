import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, googleEnabled } from '@/auth';
import AuthShell from '@/components/auth/AuthShell';
import { SignInForm } from '@/components/auth/AuthForms';
import { messageForError, safeReturnPath } from '@/components/auth/messages';

export const metadata = { title: 'Sign in · Pathora' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  const returnTo = safeReturnPath(searchParams.callbackUrl, '/dashboard');
  if ((await auth())?.user) redirect(returnTo);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to see your sessions and pick up where you left off."
      footer={
        <>
          New to Pathora?{' '}
          <Link href="/signup" className="font-medium text-navy underline underline-offset-2">
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm
        googleEnabled={googleEnabled}
        returnTo={returnTo}
        initialError={messageForError(searchParams.error)}
      />
    </AuthShell>
  );
}
