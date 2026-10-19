import { ArrowUpRight } from 'lucide-react';
import type { OpportunityDTO } from '@/lib/db/queries/dto';
import { deadlineLabel } from '@/lib/opportunities/format';

export { deadlineLabel };

/**
 * One opportunity: what it is, when it closes, and who published it. The
 * whole row opens the publisher's page in a new tab; the details live there.
 */
export default function OpportunityRow({
  opportunity: o,
  showSummary = false,
  now,
}: {
  opportunity: OpportunityDTO;
  /** The Opportunities page shows the summary; the dashboard keeps rows short. */
  showSummary?: boolean;
  now?: Date;
}) {
  const deadline = deadlineLabel(o.deadline, now);
  return (
    <a
      href={o.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface"
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro font-semibold uppercase text-muted">
          {o.type}
          {o.sector && (
            <span className="rounded-full bg-sky-soft px-2 py-0.5 text-[10.5px] tracking-[0.06em] text-navy">
              {o.sector}
            </span>
          )}
        </span>
        <span className="text-[14.5px] font-medium leading-snug text-ink group-hover:underline group-hover:underline-offset-2">
          {o.title}
        </span>
        {showSummary && o.description && (
          <span className="line-clamp-2 text-[13px] leading-relaxed text-muted">{o.description}</span>
        )}
        <span className="text-[12.5px] text-muted">
          <span className={deadline.urgent ? 'font-medium text-ink' : undefined}>{deadline.text}</span>
          <span aria-hidden="true"> · </span>
          via {o.sourceName}
        </span>
      </div>
      <ArrowUpRight
        size={17}
        strokeWidth={1.75}
        className="mt-0.5 shrink-0 text-faint transition-colors group-hover:text-navy"
        aria-hidden="true"
      />
      <span className="sr-only">(opens {o.sourceName} in a new tab)</span>
    </a>
  );
}
