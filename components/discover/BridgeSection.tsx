import Link from 'next/link';
import type { Sector } from '@/lib/types';
import { consultantsBySector, consultants } from '@/lib/data';
import ConsultantCard from '@/components/consultant/ConsultantCard';

/**
 * The mandatory bridge from discovery results to consultant booking.
 * Always renders 3 consultants — topping up from other sectors if the
 * matched sector has fewer than 3.
 */
export default function BridgeSection({ sector }: { sector: Sector }) {
  const inSector = consultantsBySector(sector);
  const topUp = consultants.filter((c) => c.sector !== sector);
  const featured = [...inSector, ...topUp].slice(0, 3);

  return (
    <section aria-label="Talk to a consultant">
      <div className="h-0.5 w-full bg-amber/60" />
      <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-fraunces text-[28px] font-extrabold tracking-tight text-navy md:text-[32px]">
            Talk to someone in this field
          </h2>
          <p className="mt-2 max-w-md text-[15px] text-text-muted">
            These consultants work in {sector}. Book a free session and ask them everything.
          </p>
        </div>
        <Link
          href="/explore"
          className="shrink-0 text-sm font-semibold text-amber-dark transition-colors hover:text-amber"
        >
          See all {sector} consultants →
        </Link>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {featured.map((c) => (
          <ConsultantCard key={c.id} consultant={c} />
        ))}
      </div>
    </section>
  );
}
