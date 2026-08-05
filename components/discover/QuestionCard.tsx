import type { ReactNode } from 'react';
import ProgressBar from './ProgressBar';

export default function QuestionCard({
  step,
  totalSteps,
  stepLabel,
  question,
  subtext,
  hint,
  children,
}: {
  step: number;
  totalSteps: number;
  stepLabel: string;
  question: string;
  subtext?: string;
  /** Right-aligned guidance, e.g. "Select all that apply". */
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div key={step} className="animate-fade-up">
      <ProgressBar currentStep={step} totalSteps={totalSteps} />

      <div className="mb-7 mt-5 flex items-center justify-between gap-4">
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-faint">
          Step {step} of {totalSteps} · {stepLabel}
        </span>
        {hint && <span className="shrink-0 text-[13px] text-faint">{hint}</span>}
      </div>

      <h2 className="text-[26px] font-bold leading-[1.15] tracking-[-0.03em] text-ink md:text-[32px]">
        {question}
      </h2>
      {subtext && <p className="mt-3 text-base leading-relaxed text-muted">{subtext}</p>}

      <div className="mt-9">{children}</div>
    </div>
  );
}
