/** Flat segment track — one 3px bar per step, filled up to the current step. */
export default function ProgressBar({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentStep} of ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }).map((_, i) => (
        <span
          key={i}
          className={`h-[3px] flex-1 transition-colors duration-300 ${
            i < currentStep ? 'bg-ink' : 'bg-line'
          }`}
        />
      ))}
    </div>
  );
}
