import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import { ResetPasswordForm } from '@/components/auth/AuthForms';
import { PASSWORD_HINT } from '@/lib/auth/password';
import { isResetLinkValid } from '@/lib/db/queries/passwords';

export const metadata = { title: 'Choose a new password · Pathora' };
export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? '';
  const valid = await isResetLinkValid(token);

  return (
    <AuthShell
      title={valid ? 'Choose a new password' : 'This link no longer works'}
      subtitle={
        valid
          ? 'You will be signed out everywhere you were signed in before.'
          : 'Reset links work once, for one hour. Ask for a new one and use the newest email.'
      }
    >
      {valid ? (
        <ResetPasswordForm token={token} hint={PASSWORD_HINT} />
      ) : (
        <Link
          href="/forgot-password"
          className="flex h-12 w-full items-center justify-center rounded bg-navy text-[15px] font-medium text-white transition-colors hover:bg-navy-deep"
        >
          Send me a new link
        </Link>
      )}
    </AuthShell>
  );
}
