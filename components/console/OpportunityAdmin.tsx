'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import type { OpportunityDTO } from '@/lib/db/queries/dto';
import { MANUAL_SOURCES, OPPORTUNITY_TYPES, SOURCES } from '@/lib/opportunities/sources';
import { deadlineLabel } from '@/lib/opportunities/format';
import { SECTORS } from '@/lib/types';
import { useHydrated } from '@/components/ui/useHydrated';

const field =
  'h-11 w-full rounded border border-line bg-white px-3 text-[14px] text-ink outline-none focus:border-navy';
const label = 'flex flex-col gap-1.5 text-[13px] font-medium text-ink';

interface Report {
  source: keyof typeof SOURCES;
  read: number;
  saved: number;
  skippedClosed: number;
  error?: string;
}

export default function OpportunityAdmin({
  opportunities,
  lastUpdated,
}: {
  opportunities: OpportunityDTO[];
  lastUpdated: string | null;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [saving, setSaving] = useState(false);
  const hydrated = useHydrated();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [hiding, setHiding] = useState<string | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    setReports(null);
    const res = await fetch('/api/admin/opportunities/refresh', { method: 'POST' }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setReports(data?.reports ?? []);
    setRefreshing(false);
    router.refresh();
  };

  const add = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setSaving(true);
    setMessage(null);
    const res = await fetch('/api/admin/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: f.get('title'),
        organisation: f.get('organisation') || undefined,
        type: f.get('type'),
        sector: f.get('sector') || null,
        description: f.get('description') || undefined,
        url: f.get('url'),
        deadline: f.get('deadline') || null,
        source: f.get('source'),
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSaving(false);
    if (res?.ok) {
      form.reset();
      setMessage({ ok: true, text: 'Added. Students can see it now.' });
      router.refresh();
    } else {
      setMessage({ ok: false, text: data?.error ?? 'Could not add it.' });
    }
  };

  const hide = async (id: string) => {
    setHiding(id);
    await fetch(`/api/admin/opportunities/${id}`, { method: 'DELETE' }).catch(() => null);
    setHiding(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-7">
      {/* Feeds */}
      <section className="flex flex-col gap-4 rounded-lg border border-line p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Publisher feeds</h2>
          <p className="mt-1 text-[13.5px] text-muted">
            {lastUpdated ? `Last read ${new Date(lastUpdated).toLocaleString('en-GB')}.` : 'Not read yet.'} Once deployed,
            this runs on a schedule; you can also run <code className="rounded bg-surface px-1">npm run fetch-opportunities</code>.
          </p>
          {reports && (
            <ul className="mt-3 flex flex-col gap-1 text-[13px]">
              {reports.length === 0 && <li className="text-ink">The refresh did not complete. Try again.</li>}
              {reports.map((r) => (
                <li key={r.source} className={r.error ? 'text-ink' : 'text-muted'}>
                  {SOURCES[r.source].name}:{' '}
                  {r.error ? `failed (${r.error})` : `${r.saved} saved, ${r.skippedClosed} already closed`}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-60"
        >
          {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          {refreshing ? 'Reading feeds…' : 'Read feeds now'}
        </button>
      </section>

      {/* Add by hand */}
      <section className="rounded-lg border border-line p-5">
        <h2 className="text-[15px] font-semibold text-ink">Add a listing</h2>
        <p className="mt-1 text-[13.5px] text-muted">For sources without a feed, such as ALU SPD.</p>
        <form onSubmit={add} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className={`${label} md:col-span-2`}>
            Title
            <input name="title" required minLength={3} maxLength={290} className={field} />
          </label>
          <label className={`${label} md:col-span-2`}>
            Link to apply or read more
            <input name="url" type="url" required placeholder="https://" className={field} />
          </label>
          <label className={label}>
            Type
            <select name="type" required defaultValue="Internship" className={field}>
              {OPPORTUNITY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Sector
            <select name="sector" defaultValue="" className={field}>
              <option value="">Open to every sector</option>
              {SECTORS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Deadline (leave empty if none)
            <input name="deadline" type="date" className={field} />
          </label>
          <label className={label}>
            Source
            <select name="source" defaultValue="alu-spd" className={field}>
              {MANUAL_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCES[s].name}
                </option>
              ))}
            </select>
          </label>
          <label className={`${label} md:col-span-2`}>
            Organisation (optional)
            <input name="organisation" maxLength={200} className={field} />
          </label>
          <label className={`${label} md:col-span-2`}>
            Short summary (optional)
            <textarea name="description" maxLength={600} rows={3} className={`${field} h-auto py-2.5`} />
          </label>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving || !hydrated}
              className="inline-flex items-center gap-2 rounded bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-60"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Add listing
            </button>
            {message && (
              <p role="status" className={`text-[13px] ${message.ok ? 'text-available' : 'text-ink'}`}>
                {message.text}
              </p>
            )}
          </div>
        </form>
      </section>

      {/* Everything listed */}
      <section className="overflow-hidden rounded-lg border border-line">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink">Listed now · {opportunities.length}</h2>
        </div>
        {opportunities.length === 0 ? (
          <p className="px-5 py-5 text-[13.5px] text-muted">Nothing listed. Read the feeds or add one above.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {opportunities.map((o) => (
              <li key={o.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <a href={o.url} target="_blank" rel="noopener noreferrer" className="block truncate text-[14px] font-medium text-ink hover:underline">
                    {o.title}
                  </a>
                  <p className="truncate text-[12.5px] text-muted">
                    {o.type}
                    {o.sector ? ` · ${o.sector}` : ''} · {deadlineLabel(o.deadline).text} · {o.sourceName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => hide(o.id)}
                  disabled={hiding === o.id}
                  className="shrink-0 rounded border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink transition-colors hover:bg-surface disabled:opacity-60"
                >
                  {hiding === o.id ? 'Taking down…' : 'Take down'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
