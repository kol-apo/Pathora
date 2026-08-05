import Link from 'next/link';
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
    <article className="animate-fade-up rounded-lg border border-line p-6 md:p-8">
      <Badge variant="label">Your strongest match</Badge>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-[28px] font-bold tracking-[-0.03em] text-ink md:text-[32px]">
          {match.title}
        </h2>
        <Badge variant="sector">{match.sector}</Badge>
      </div>

      <p className="mt-6 text-micro font-semibold uppercase text-faint">Why this fits you</p>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink">{why}</p>

      <div className="mt-5 flex flex-wrap gap-[7px]">
        {match.skills.map((skill) => (
          <Badge key={skill} variant="tag">
            {skill}
          </Badge>
        ))}
      </div>

      <p className="mt-6 flex items-start gap-2 text-sm leading-relaxed text-muted">
        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-available" aria-hidden="true" />
        <span>
          <span className="font-medium text-ink">In the African market:</span> {africanMarket}
        </span>
      </p>

      <div className="mt-8 border-t border-line pt-6">
        <p className="text-micro font-semibold uppercase text-faint">Your roadmap</p>
        <ol className="mt-5">
          {roadmap.map((phase, i) => (
            <li key={phase.period} className="relative flex gap-5 pb-8 last:pb-0">
              {i < roadmap.length - 1 && (
                <span
                  className="absolute bottom-0 left-[15px] top-9 border-l border-line"
                  aria-hidden="true"
                />
              )}
              <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fill text-[13px] font-semibold text-ink">
                {i + 1}
              </span>
              <div>
                <p className="text-micro font-semibold uppercase text-faint">{phase.period}</p>
                <p className="mt-1 text-lg font-semibold tracking-[-0.01em] text-ink">
                  {phase.focus}
                </p>
                <ul className="mt-2.5 space-y-2">
                  {phase.actions.map((action) => (
                    <li key={action} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                      <span
                        className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-faint"
                        aria-hidden="true"
                      />
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
    <article className="animate-fade-up rounded-lg border border-line p-[22px] transition-colors duration-150 hover:border-faint/40">
      <Badge variant="label">Good match</Badge>
      <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-ink">{match.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{match.description}</p>
      <div className="mt-4 flex flex-wrap gap-[7px]">
        {match.skills.map((skill) => (
          <Badge key={skill} variant="tag">
            {skill}
          </Badge>
        ))}
      </div>
      <Link
        href="/explore"
        className="mt-5 inline-block text-sm font-medium text-ink underline-offset-4 hover:underline"
      >
        Explore this path →
      </Link>
    </article>
  );
}
