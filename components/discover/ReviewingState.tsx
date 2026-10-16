import Guide from '@/components/brand/Guide';

/**
 * The interstitial between the last answer and the results. It always shows
 * for at least 2.5 seconds (enforced by the discover page).
 */
export default function ReviewingState() {
  return (
    <div
      className="flex min-h-[520px] flex-col items-center justify-center gap-[22px] px-5 text-center"
      role="status"
      aria-live="polite"
    >
      <Guide size={96} mood="thinking" />
      <div className="mt-2 h-0.5 w-[120px] overflow-hidden bg-sky-muted">
        <div className="animate-bar h-0.5 w-[32%] bg-navy motion-reduce:animate-none" />
      </div>
      <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">
        Reviewing your answers
      </h2>
      <p className="max-w-[380px] text-[15px] leading-relaxed text-muted">
        Matching what you told us against 14 career paths and the consultants working in them.
      </p>
    </div>
  );
}
