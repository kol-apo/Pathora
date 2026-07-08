import type { ReactNode } from 'react';

export default function QuestionCard({
  step,
  totalSteps,
  question,
  subtext,
  children,
}: {
  step: number;
  totalSteps: number;
  question: string;
  subtext?: string;
  children: ReactNode;
}) {
  return (
    <div
      key={step}
      className="animate-slide-left mx-auto w-full max-w-[640px] rounded-2xl bg-white p-7 shadow-modal md:p-12"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-amber-dark">
        Step {step} of {totalSteps}
      </p>
      <h2 className="mt-3 font-fraunces text-[22px] font-bold leading-snug text-navy md:text-[26px]">
        {question}
      </h2>
      {subtext && <p className="mt-2 text-[15px] text-text-muted">{subtext}</p>}
      <div className="mt-7">{children}</div>
    </div>
  );
}
