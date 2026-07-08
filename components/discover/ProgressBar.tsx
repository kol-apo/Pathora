import { Check } from 'lucide-react';

const stepLabels = ['About You', 'Interests', 'Work Style', 'Strengths', 'Vision', 'Context'];

export default function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-2">
      <div className="flex items-center">
        {stepLabels.map((label, i) => {
          const step = i + 1;
          const completed = step < currentStep;
          const active = step === currentStep;
          return (
            <div key={label} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
              {i > 0 && (
                <div
                  className={`h-0.5 flex-1 transition-colors duration-300 ${
                    completed || active ? 'bg-amber' : 'bg-black/10'
                  }`}
                />
              )}
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-300 ${
                    completed
                      ? 'bg-navy text-white'
                      : active
                        ? 'bg-amber text-white'
                        : 'bg-black/5 text-text-light'
                  }`}
                >
                  {completed ? <Check size={14} /> : step}
                </span>
                <span
                  className={`mt-1.5 hidden text-[10px] font-medium sm:block ${
                    active ? 'text-amber-dark' : 'text-text-light'
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
