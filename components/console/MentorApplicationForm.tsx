'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { SECTORS } from '@/lib/types';
import LinksEditor, { emptyLinks, linksPayload, type LinksValue } from './LinksEditor';

const TIMEZONES = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Abidjan',
  'Africa/Dakar',
  'Africa/Douala',
  'Africa/Kigali',
  'Africa/Nairobi',
  'Africa/Kampala',
  'Africa/Dar_es_Salaam',
  'Africa/Addis_Ababa',
  'Africa/Lusaka',
  'Africa/Harare',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Europe/London',
  'America/New_York',
];

const inputClass =
  'mt-1.5 w-full rounded border border-line bg-white px-4 text-[15px] text-ink placeholder:text-faint focus:border-navy focus:outline-none';

function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: (id: string, hintId?: string) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="text-[13.5px] font-medium text-ink">
        {label}
      </label>
      {children(id, hintId)}
      {hint && (
        <p id={hintId} className="mt-1.5 text-[12.5px] text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

const splitList = (text: string, by: RegExp) =>
  text
    .split(by)
    .map((s) => s.trim())
    .filter(Boolean);

export default function MentorApplicationForm() {
  const router = useRouter();
  const { update } = useSession();
  const [form, setForm] = useState({
    role: '',
    company: '',
    sector: 'Technology',
    country: '',
    timezone: 'Africa/Lagos',
    experience: '',
    bio: '',
    focus: '',
    tags: '',
    helpWith: '',
    codeOfConductOk: false,
  });
  const [links, setLinks] = useState<LinksValue>(emptyLinks());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  // Default the timezone to the applicant's own, when it is one we list.
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONES.includes(zone)) setForm((f) => ({ ...f, timezone: zone }));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/mentor/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        experience: Number(form.experience),
        focus: splitList(form.focus, /,/),
        tags: splitList(form.tags, /,/),
        helpWith: splitList(form.helpWith, /\n/),
        ...linksPayload(links),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Could not submit your application.');
      setBusy(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // The account is a mentor account now: refresh the session cookie so the
    // new role is carried everywhere, then go to the mentor home.
    await update();
    router.push('/mentor');
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && (
        <div role="alert" className="flex gap-2.5 rounded-lg border border-line bg-surface p-3.5 text-[13.5px] text-ink">
          <AlertCircle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-1 text-[15px] font-semibold text-ink">Your work</legend>
        <Labelled label="Job title">
          {(id) => <input id={id} required value={form.role} onChange={set('role')} className={`${inputClass} h-12`} placeholder="e.g. Software Engineer" />}
        </Labelled>
        <Labelled label="Where you work">
          {(id) => <input id={id} required value={form.company} onChange={set('company')} className={`${inputClass} h-12`} placeholder="Company, or Freelance" />}
        </Labelled>
        <Labelled label="Sector">
          {(id) => (
            <select id={id} value={form.sector} onChange={set('sector')} className={`${inputClass} h-12`}>
              {SECTORS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
        </Labelled>
        <Labelled label="Years of experience">
          {(id) => (
            <input id={id} required type="number" min={1} max={60} value={form.experience} onChange={set('experience')} className={`${inputClass} h-12`} />
          )}
        </Labelled>
        <Labelled label="Country">
          {(id) => <input id={id} required value={form.country} onChange={set('country')} className={`${inputClass} h-12`} placeholder="e.g. Rwanda" />}
        </Labelled>
        <Labelled label="Timezone">
          {(id) => (
            <select id={id} value={form.timezone} onChange={set('timezone')} className={`${inputClass} h-12`}>
              {TIMEZONES.map((z) => (
                <option key={z} value={z}>
                  {z.replace('_', ' ')}
                </option>
              ))}
            </select>
          )}
        </Labelled>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 text-[15px] font-semibold text-ink">What students will see</legend>
        <Labelled label="About you" hint="80 to 1,200 characters. What you do, how you got there, and how you help students.">
          {(id, hintId) => (
            <textarea
              id={id}
              required
              rows={5}
              value={form.bio}
              onChange={set('bio')}
              aria-describedby={hintId}
              className={`${inputClass} py-3 leading-relaxed`}
            />
          )}
        </Labelled>
        <Labelled label="Focus areas" hint="Up to three, separated by commas. Shown on your card.">
          {(id, hintId) => (
            <input id={id} required value={form.focus} onChange={set('focus')} aria-describedby={hintId} className={`${inputClass} h-12`} placeholder="e.g. Backend engineering, Career switching" />
          )}
        </Labelled>
        <Labelled label="Skills and topics" hint="Optional, separated by commas.">
          {(id, hintId) => (
            <input id={id} value={form.tags} onChange={set('tags')} aria-describedby={hintId} className={`${inputClass} h-12`} placeholder="e.g. Python, System Design, Interviews" />
          )}
        </Labelled>
        <Labelled label="What you can help with" hint="One per line, up to six.">
          {(id, hintId) => (
            <textarea
              id={id}
              required
              rows={4}
              value={form.helpWith}
              onChange={set('helpWith')}
              aria-describedby={hintId}
              className={`${inputClass} py-3 leading-relaxed`}
              placeholder={'Getting your first engineering job\nReviewing a portfolio'}
            />
          )}
        </Labelled>
      </fieldset>

      <fieldset>
        <legend className="text-[15px] font-semibold text-ink">
          Links <span className="font-normal text-muted">(optional)</span>
        </legend>
        <p className="mb-4 mt-1 text-[13px] text-muted">
          Help the Pathora team verify your experience, and give students a fuller picture of your work.
        </p>
        <LinksEditor value={links} onChange={setLinks} />
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-4 transition-colors hover:border-navy">
        <input type="checkbox" checked={form.codeOfConductOk} onChange={set('codeOfConductOk')} className="mt-0.5 h-5 w-5 shrink-0 accent-[#1D3F5A]" />
        <span className="text-[14px] leading-relaxed text-ink">
          <span className="font-medium">I agree to the Pathora code of conduct.</span> I will treat students with
          respect, keep what they share private, never ask for payment, and not record sessions.
        </span>
      </label>

      <button
        type="submit"
        disabled={busy || !form.codeOfConductOk}
        className="flex h-12 w-full items-center justify-center gap-2 rounded bg-navy text-[15px] font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-40 sm:w-auto sm:px-8"
      >
        {busy && <Loader2 size={17} className="animate-spin" />}
        Submit application
      </button>
    </form>
  );
}
