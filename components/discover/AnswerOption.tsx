'use client';

import { Check } from 'lucide-react';

export default function AnswerOption({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-xl px-5 py-4 text-left transition-all duration-[180ms] ease-out ${
        selected
          ? 'border-2 border-amber bg-amber-light'
          : 'border border-black/10 bg-white hover:border-amber/50 hover:bg-amber-light'
      }`}
    >
      {icon && <span className="text-lg" aria-hidden="true">{icon}</span>}
      <span className="flex-1 text-[15px] font-medium text-text-main">{label}</span>
      {selected && <Check size={18} className="shrink-0 text-amber-dark" />}
    </button>
  );
}
