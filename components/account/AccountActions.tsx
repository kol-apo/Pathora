'use client';

import { useId, useState } from 'react';
import { signOut } from 'next-auth/react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/** Email a password-change link to the signed-in person's own address. */
export function ChangePasswordButton({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const send = async () => {
    setState('busy');
    const res = await fetch('/api/password/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    setState(res?.ok ? 'sent' : 'error');
  };
  if (state === 'sent') {
    return (
      <p role="status" className="text-[13.5px] text-ink">
        Sent. Check {email} for a link; it works for one hour.
      </p>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={send}
        disabled={state === 'busy'}
        className="inline-flex items-center gap-2 rounded border border-line px-4 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface disabled:opacity-60"
      >
        {state === 'busy' && <Loader2 size={14} className="animate-spin" />}
        Email me a link to change it
      </button>
      {state === 'error' && <p role="alert" className="text-[12.5px] text-ink">Could not send it. Please try again.</p>}
    </div>
  );
}

/**
 * Withdraw from the study and delete the account. Two deliberate steps:
 * open the form, then type DELETE (and the password, for password accounts).
 */
export function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmId = useId();
  const passwordId = useId();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm, password: hasPassword ? password : null }),
    }).catch(() => null);
    if (!res?.ok) {
      setError((await res?.json().catch(() => null))?.error ?? 'Could not delete the account. Please try again.');
      setBusy(false);
      return;
    }
    // Pathy's chats live only on this device: clear them too.
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('pathora.'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // Storage unavailable: nothing was saved there.
    }
    await signOut({ redirectTo: '/?deleted=1' });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-ink/20 px-4 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:border-ink hover:bg-surface"
      >
        Withdraw and delete my account
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4 rounded-lg border border-ink/15 bg-surface p-5">
      <p className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink">
        <AlertTriangle size={17} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
        This cannot be undone. Your account and everything listed above is deleted straight away.
      </p>
      <div>
        <label htmlFor={confirmId} className="text-[13.5px] font-medium text-ink">
          Type DELETE to confirm
        </label>
        <input
          id={confirmId}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          className="mt-1.5 h-11 w-full rounded border border-line bg-white px-3 text-[15px] text-ink focus:border-navy focus:outline-none"
        />
      </div>
      {hasPassword && (
        <div>
          <label htmlFor={passwordId} className="text-[13.5px] font-medium text-ink">
            Your password
          </label>
          <input
            id={passwordId}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1.5 h-11 w-full rounded border border-line bg-white px-3 text-[15px] text-ink focus:border-navy focus:outline-none"
          />
        </div>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-ink">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2.5">
        <button
          type="submit"
          disabled={busy || confirm !== 'DELETE' || (hasPassword && !password)}
          className="inline-flex items-center gap-2 rounded bg-ink px-4 py-2.5 text-[13.5px] font-medium text-white transition-colors hover:bg-ink/85 disabled:opacity-40"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          Delete everything
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirm('');
            setPassword('');
            setError(null);
          }}
          disabled={busy}
          className="rounded border border-line bg-white px-4 py-2.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-surface"
        >
          Keep my account
        </button>
      </div>
    </form>
  );
}
