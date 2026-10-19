'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { messageForError } from './messages';

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-5 flex gap-2.5 rounded-lg border border-line bg-surface p-3.5 text-[13.5px] leading-relaxed text-ink"
    >
      <AlertCircle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

/**
 * Each input has its own <label for>, and any hint is attached with
 * aria-describedby, so screen readers announce just the label as the name.
 */
function Field({
  label,
  hint,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-[13.5px] font-medium text-ink">
        {label}
      </label>
      <input
        {...input}
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-1.5 h-12 w-full rounded border border-line bg-white px-4 text-[15px] text-ink placeholder:text-faint focus:border-navy focus:outline-none"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  label,
  hint,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-[13.5px] font-medium text-ink">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="h-12 w-full rounded border border-line bg-white pl-4 pr-12 text-[15px] text-ink placeholder:text-faint focus:border-navy focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-controls={id}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-faint transition-colors hover:text-navy"
        >
          {show ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[12.5px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex h-12 w-full items-center justify-center gap-2 rounded bg-navy text-[15px] font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
    >
      {busy && <Loader2 size={17} className="animate-spin" />}
      {children}
    </button>
  );
}

export function GoogleButton({ label, redirectTo }: { label: string; redirectTo: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void signIn('google', { redirectTo });
        }}
        className="flex h-12 w-full items-center justify-center gap-3 rounded border border-line bg-white text-[15px] font-medium text-ink transition-colors hover:bg-surface disabled:opacity-60"
      >
        {busy ? (
          <Loader2 size={17} className="animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1z" />
            <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
          </svg>
        )}
        {label}
      </button>
      <div className="my-6 flex items-center gap-3 text-[12.5px] text-faint">
        <span className="h-px flex-1 bg-line" />
        or with email
        <span className="h-px flex-1 bg-line" />
      </div>
    </>
  );
}

export function SignInForm({
  googleEnabled,
  returnTo,
  initialError,
}: {
  googleEnabled: boolean;
  returnTo: string;
  initialError: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn('credentials', { email, password, redirect: false });
    if (!res || res.error) {
      setError(messageForError(res?.code === 'credentials' ? 'CredentialsSignin' : (res?.error ?? 'Default')));
      setBusy(false);
      return;
    }
    router.push(returnTo);
    router.refresh();
  };

  return (
    <>
      {error && <ErrorBox message={error} />}
      {googleEnabled && <GoogleButton label="Continue with Google" redirectTo={returnTo} />}
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <p className="text-right text-[13px]">
          <Link href="/forgot-password" className="font-medium text-muted underline-offset-2 hover:text-navy hover:underline">
            Forgot your password?
          </Link>
        </p>
        <div className="pt-1">
          <SubmitButton busy={busy}>Sign in</SubmitButton>
        </div>
      </form>
    </>
  );
}

export function SignUpForm({ googleEnabled, next }: { googleEnabled: boolean; next: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<React.ReactNode>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(
        res.status === 409 ? (
          <>
            {data.error}{' '}
            <Link href="/signin" className="font-medium text-navy underline underline-offset-2">
              Sign in
            </Link>
          </>
        ) : (
          (data.error ?? 'Could not create your account. Please try again.')
        ),
      );
      setBusy(false);
      return;
    }

    const signedIn = await signIn('credentials', { email, password, redirect: false });
    if (!signedIn || signedIn.error) {
      // The account exists; send them to sign in rather than leave them stuck.
      router.push('/signin');
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <>
      {error && (
        <div
          role="alert"
          className="mb-5 flex gap-2.5 rounded-lg border border-line bg-surface p-3.5 text-[13.5px] leading-relaxed text-ink"
        >
          <AlertCircle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {googleEnabled && <GoogleButton label="Sign up with Google" redirectTo={next} />}
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Full name"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          label="Password"
          hint="At least 8 characters, with a letter and a number."
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <div className="pt-2">
          <SubmitButton busy={busy}>Create account</SubmitButton>
        </div>
      </form>
    </>
  );
}

/** Ask for a reset link. The answer is the same whether or not the email has an account. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/password/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError((await res?.json().catch(() => null))?.error ?? 'Something went wrong. Please try again.');
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div role="status" className="rounded-lg border border-sky-muted bg-sky-soft p-5 text-[14.5px] leading-relaxed text-ink">
        <p className="font-medium">Check your email.</p>
        <p className="mt-1.5 text-muted">
          If {email} has a Pathora account, we have sent it a link to choose a new password. The link works for one hour.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && <ErrorBox message={error} />}
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="pt-2">
          <SubmitButton busy={busy}>Send reset link</SubmitButton>
        </div>
      </form>
    </>
  );
}

/** Choose a new password from an emailed link. */
export function ResetPasswordForm({ token, hint }: { token: string; hint: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch('/api/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError((await res?.json().catch(() => null))?.error ?? 'Something went wrong. Please try again.');
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div role="status" className="rounded-lg border border-sky-muted bg-sky-soft p-5 text-[14.5px] leading-relaxed text-ink">
        <p className="font-medium">Your password has been changed.</p>
        <p className="mt-1.5 text-muted">Anywhere you were signed in before has been signed out.</p>
        <Link href="/signin" className="mt-4 inline-block font-medium text-navy underline underline-offset-2">
          Sign in with your new password
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && <ErrorBox message={error} />}
      <form onSubmit={submit} className="space-y-4">
        <PasswordField label="New password" hint={hint} value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <div className="pt-2">
          <SubmitButton busy={busy}>Change password</SubmitButton>
        </div>
      </form>
    </>
  );
}
