'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import type { OpportunityDTO } from '@/lib/db/queries/dto';
import type { Sector } from '@/lib/types';
import OpportunityRow from './OpportunityRow';

const PAGE = 20;

/** Filter by type, by the student's own sector, and by words; newest-closing first. */
export default function OpportunityBrowser({
  opportunities,
  mySector,
  nowIso,
}: {
  opportunities: OpportunityDTO[];
  mySector: Sector | null;
  /** The server's clock, so "11 days left" reads the same before and after the page loads. */
  nowIso: string;
}) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [type, setType] = useState<string>('All');
  const [mine, setMine] = useState(false);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  // Only the types that actually have listings, most common first.
  const types = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of opportunities) counts.set(o.type, (counts.get(o.type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [opportunities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter(
      (o) =>
        (type === 'All' || o.type === type) &&
        (!mine || o.sector === mySector || o.sector === null) &&
        (q === '' || `${o.title} ${o.description} ${o.sourceName}`.toLowerCase().includes(q)),
    );
  }, [opportunities, type, mine, mySector, query]);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
      active ? 'border-navy bg-navy text-white' : 'border-line text-ink hover:bg-surface'
    }`;

  if (opportunities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
        <p className="text-[15px] font-medium text-ink">No open opportunities yet</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">
          New listings arrive every day. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Input
          icon={<Search size={17} strokeWidth={1.5} />}
          placeholder="Search opportunities"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE);
          }}
          aria-label="Search opportunities"
        />
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by type">
          {['All', ...types].map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => {
                setType(t);
                setShown(PAGE);
              }}
              className={chip(type === t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {mySector ? (
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13.5px] text-ink">
              <input
                type="checkbox"
                checked={mine}
                onChange={(e) => {
                  setMine(e.target.checked);
                  setShown(PAGE);
                }}
                className="h-4 w-4 accent-navy"
              />
              Only {mySector}, and ones open to every field
            </label>
          ) : (
            <span />
          )}
          <span className="text-[13px] text-muted">
            {filtered.length} open opportunit{filtered.length === 1 ? 'y' : 'ies'}
          </span>
        </div>
      </div>

      {filtered.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-line">
          <div className="flex flex-col divide-y divide-line">
            {filtered.slice(0, shown).map((o) => (
              <OpportunityRow key={o.id} opportunity={o} showSummary now={now} />
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-lg border border-dashed border-line bg-surface px-6 py-10 text-center text-sm text-muted">
          Nothing matches those filters.
        </p>
      )}

      {filtered.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="self-center rounded border border-line px-[22px] py-[11px] text-sm font-medium text-ink transition-colors hover:bg-surface"
        >
          Show more
        </button>
      )}
    </div>
  );
}
