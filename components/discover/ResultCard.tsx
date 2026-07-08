import Link from 'next/link';
import { Globe } from 'lucide-react';
import type { CareerMatch, RoadmapPhase } from '@/lib/types';
import Badge from '@/components/ui/Badge';

export function PrimaryResultCard({
  match,
  why,
  africanMarket,
  roadmap,
}: {
  match: CareerMatch;
  why: string;
  africanMarket: string;
  roadmap: RoadmapPhase[];
}) {
  return (
    <article className="animate-fade-up rounded-r-xl border border-l-[6px] border-l-amber bg-white p-6 shadow-card md:p-8">
      <Badge variant="match-strong">Your strongest match</Badge>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h2 className="font-fraunces text-[28px] font-extrabold text-navy md:text-[32px]">
          {match.title}
        </h2>
        <Badge variant="sector">{match.sector}</Badge>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.8px] text-text-light">
        Why this fits you
      </p>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-text-main">{why}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {match.skills.map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-warm-gray px-3 py-1.5 text-xs font-medium text-text-muted"
          >
            {skill}
          </span>
        ))}
      </div>

      <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-forest">
        <Globe size={15} />
        In the African market: {africanMarket}
      </p>

      <div className="mt-8 border-t pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.8px] text-text-light">
          Your roadmap
        </p>
        <ol className="mt-5 space-y-0">
          {roadmap.map((phase, i) => (
            <li key={phase.period} className="relative flex gap-5 pb-8 last:pb-0">
              {i < roadmap.length - 1 && (
                <span
                  className="absolute left-[15px] top-8 bottom-0 border-l-2 border-dashed border-amber/50"
                  aria-hidden="true"
                />
              )}
              <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-light font-fraunces text-xs font-bold text-amber-dark">
                {i + 1}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.8px] text-amber-dark">
                  {phase.period}
                </p>
                <p className="mt-0.5 font-fraunces text-lg font-bold text-navy">{phase.focus}</p>
                <ul className="mt-2 space-y-1.5">
                  {phase.actions.map((action) => (
                    <li key={action} className="flex gap-2 text-sm leading-relaxed text-text-muted">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

export function SecondaryResultCard({ match }: { match: CareerMatch }) {
  return (
    <article className="animate-fade-up rounded-xl border bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-amber/30 hover:shadow-card-hover">
      <Badge variant="match-good">Good match</Badge>
      <h3 className="mt-3 font-fraunces text-xl font-bold text-navy">{match.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{match.description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {match.skills.map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-warm-gray px-2.5 py-1 text-xs font-medium text-text-muted"
          >
            {skill}
          </span>
        ))}
      </div>
      <Link
        href="/explore"
        className="mt-4 inline-block text-sm font-semibold text-amber-dark transition-colors hover:text-amber"
      >
        Explore this path →
      </Link>
    </article>
  );
}
