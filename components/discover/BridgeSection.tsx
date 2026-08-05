import Link from 'next/link';
import type { Sector } from '@/lib/types';
import { featuredForSector } from '@/lib/data';
import ConsultantCard from '@/components/consultant/ConsultantCard';

/**
 * The mandatory bridge from discovery results to consultant booking.
 * Always renders 3 consultants — topped up from other sectors if the matched
 * sector has fewer than 3.
 */
export default function BridgeSection({ sector }: { sector: Sector }) {
  const featured = featuredForSector(sector, 3);

  return (
    <section aria-label="Talk to a consultant" className="border-t border-line pt-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-[26px] font-bold tracking-[-0.03em] text-ink md:text-[30px]">
            Talk to someone in this field
          </h2>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">
            These consultants work in {sector}. Book a free session and ask them everything.
          </p>
        </div>
        <Link
          href="/explore"
          className="shrink-0 text-sm font-medium text-ink underline-offset-4 hover:underline"
        >
          See all {sector} consultants →
        </Link>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {featured.map((c) => (
          <ConsultantCard key={c.id} consultant={c} />
        ))}
      </div>
    </section>
  );
}
