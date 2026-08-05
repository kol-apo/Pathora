'use client';

import { Check } from 'lucide-react';

export default function AnswerOption({
  label,
  selected,
  onClick,
  multi = false,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  /** Multi-select renders a square checkbox; single-select renders a radio. */
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      className={`flex w-full items-center gap-3.5 rounded-lg border p-5 text-left transition-colors duration-150 ${
        selected ? 'border-ink bg-surface' : 'border-line bg-white hover:border-faint/50'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 shrink-0 items-center justify-center ${
          multi ? 'rounded-md' : 'rounded-full'
        } ${selected ? 'bg-ink' : 'border border-line'}`}
      >
        {selected &&
          (multi ? (
            <Check size={12} strokeWidth={2.5} className="text-white" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          ))}
      </span>
      <span className="text-[15px] font-medium text-ink">{label}</span>
    </button>
  );
}
