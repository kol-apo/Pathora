import Link from 'next/link';
import AuthShell from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/AuthForms';

export const metadata = { title: 'Reset your password · Pathora' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you signed up with, and we will send you a link to choose a new password."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/signin" className="font-medium text-navy underline underline-offset-2">
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
