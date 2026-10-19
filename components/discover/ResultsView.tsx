import Guide from '@/components/brand/Guide';
import { PrimaryResultCard, SecondaryResultCard } from '@/components/discover/ResultCard';
import BridgeSection from '@/components/discover/BridgeSection';
import type { CareerMatch } from '@/lib/ai/schema';
import type { BridgeView } from '@/lib/db/queries/discovery';

/**
 * A discovery result: the match, the roadmap, the other paths, and the bridge
 * to three people. Shared by the chat's results screen and the saved-result
 * page, so a result looks the same whenever the student comes back to it.
 * `children` is the row of actions underneath.
 */
export default function ResultsView({
  match,
  bridge,
  resultId,
  subtitle = 'Based on your answers, these paths align with who you are and where you could excel.',
  children,
}: {
  match: CareerMatch;
  bridge: BridgeView | null;
  resultId: string | null;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-14 md:px-10">
      <header className="flex animate-fade-up flex-col gap-6 sm:flex-row sm:items-center">
        <Guide size={76} mood="happy" />
        <div>
          <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.03em] text-ink md:text-[38px]">
            Here&apos;s what we found for you
          </h1>
          <p className="mt-2.5 max-w-[560px] text-base leading-relaxed text-muted">{subtitle}</p>
        </div>
      </header>

      <div className="mt-10">
        <PrimaryResultCard
          match={match.primary}
          why={match.primary.why}
          africanMarket={match.primary.africanMarket}
          roadmap={match.primary.roadmap}
        />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {match.secondary.map((s) => (
          <SecondaryResultCard key={s.title} match={s} />
        ))}
      </div>

      {/* Every discovery result ends here — results always bridge to people. */}
      <div className="mt-16">
        <BridgeSection sector={match.primary.sector} bridge={bridge} resultId={resultId} />
      </div>

      {children && (
        <div className="mt-16 flex flex-col items-center gap-4 border-t border-line pt-10">{children}</div>
      )}
    </main>
  );
}
