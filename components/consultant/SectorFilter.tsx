'use client';

import { SECTORS } from '@/lib/types';

const options = ['All', ...SECTORS] as const;

export default function SectorFilter({
  active,
  onChange,
}: {
  active: string;
  onChange: (sector: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by sector">
      {options.map((sector) => {
        const isActive = active === sector;
        return (
          <button
            key={sector}
            onClick={() => onChange(sector)}
            aria-pressed={isActive}
            className={`rounded-full px-4 py-[9px] text-[13.5px] font-medium transition-colors duration-150 ${
              isActive
                ? 'bg-ink-soft text-white'
                : 'border border-line bg-white text-ink hover:bg-surface'
            }`}
          >
            {sector}
          </button>
        );
      })}
    </div>
  );
}
