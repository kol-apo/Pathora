'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import LinksEditor, { linksPayload, type LinksValue } from './LinksEditor';

/** The mentor's links, editable after they have applied. */
export default function ProfileLinksForm({ initial }: { initial: LinksValue }) {
  const router = useRouter();
  const [value, setValue] = useState<LinksValue>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch('/api/mentor/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linksPayload(value)),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage({ ok: false, text: data.error ?? 'Could not save your links.' });
      return;
    }
    // Show the tidied addresses the server stored (e.g. "@name" becomes a full x.com link).
    setValue({
      linkedin: data.socials?.linkedin ?? '',
      x: data.socials?.x ?? '',
      links: (data.links ?? []).map((l: { kind: LinksValue['links'][number]['kind']; url: string; title?: string }) => ({
        kind: l.kind,
        url: l.url,
        title: l.title ?? '',
      })),
    });
    setMessage({ ok: true, text: 'Saved. Students see these on your profile.' });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line p-5 md:p-6">
        <LinksEditor value={value} onChange={setValue} />
      </section>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button
          onClick={save}
          disabled={busy}
          className="flex items-center gap-2 rounded bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Save links
        </button>
        {message && (
          <p role="status" className="flex items-center gap-2 text-[13.5px] text-ink">
            {message.ok ? <Check size={15} className="text-available" /> : <AlertCircle size={15} />}
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
