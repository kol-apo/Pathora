import type { Opportunity } from '@/lib/types';

/** Dashboard list row: type label + title on the left, deadline right-aligned. */
export default function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const o = opportunity;
  const rolling = o.deadline === 'Rolling';

  return (
    <a
      href={o.url}
      className="flex items-center justify-between gap-3.5 px-5 py-4 transition-colors hover:bg-surface"
    >
      <div className="flex min-w-0 flex-col gap-[5px]">
        <span className="text-micro font-semibold uppercase text-muted">{o.type}</span>
        <span className="truncate text-sm font-medium text-ink">{o.title}</span>
      </div>
      <span className={`shrink-0 text-[12.5px] ${o.urgent ? 'text-ink' : 'text-faint'}`}>
        {rolling ? 'Rolling' : `Closes ${o.deadline}`}
      </span>
    </a>
  );
}
