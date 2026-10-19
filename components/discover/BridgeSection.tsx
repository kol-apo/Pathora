import Link from 'next/link';
import type { Sector } from '@/lib/types';
import type { BridgeView } from '@/lib/db/queries/discovery';
import { toConsultant } from '@/lib/mentors';
import ConsultantCard from '@/components/consultant/ConsultantCard';

/**
 * The mandatory bridge from a discovery result to people: the three approved
 * mentors in the result's sector whose interests point most closely the same
 * way as the student's, best match first.
 *
 * With a saved result, each card links with `?bridge=<resultId>`, so opening
 * a profile and booking from it are recorded against this result. Fewer than
 * three mentors in the sector is said plainly rather than padded out from
 * other sectors.
 */
export default function BridgeSection({
  sector,
  bridge,
  resultId,
}: {
  sector: Sector;
  /** Null when the bridge could not be loaded at all. */
  bridge: BridgeView | null;
  resultId: string | null;
}) {
  const browseHref = `/explore?sector=${encodeURIComponent(sector)}`;

  return (
    <section aria-label="Talk to a mentor" className="border-t border-line pt-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-[26px] font-bold tracking-[-0.03em] text-ink md:text-[30px]">
            Talk to someone in this field
          </h2>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">
            {bridge?.status === 'ready'
              ? `Three ${sector} professionals whose interests are closest to yours. Book a free session and ask them everything.`
              : `Professionals working in ${sector} give free sessions to students.`}
          </p>
        </div>
        <Link
          href={browseHref}
          className="shrink-0 text-sm font-medium text-ink underline-offset-4 hover:underline"
        >
          See all {sector} mentors →
        </Link>
      </div>

      {bridge?.status === 'ready' && bridge.mentors.length > 0 ? (
        <ol className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {bridge.mentors.map((m, i) => (
            <li key={m.id} className="flex flex-col">
              <p className="mb-2 text-micro font-semibold uppercase text-faint">
                {i === 0 ? 'Closest match' : `Match ${i + 1}`}
              </p>
              <ConsultantCard
                consultant={toConsultant(m)}
                href={resultId ? `/consultants/${m.id}?bridge=${resultId}` : undefined}
              />
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-line bg-surface px-6 py-8 text-center">
          <p className="text-[15px] font-medium text-ink">
            {bridge?.status === 'insufficient'
              ? `We're still vetting ${sector} mentors`
              : "We couldn't load your matches just now"}
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">
            {bridge?.status === 'insufficient'
              ? 'Pathora matches every result with three people, and this sector does not have three approved yet. You can still book anyone already listed.'
              : 'Your result is safe. You can browse everyone working in this sector.'}
          </p>
          <Link
            href={browseHref}
            className="mt-5 inline-block rounded bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
          >
            Browse {sector} mentors
          </Link>
        </div>
      )}
    </section>
  );
}
