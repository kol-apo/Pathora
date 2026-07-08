'use client';

const sectors = ['All', 'Business', 'Finance', 'Technology'] as const;

export default function SectorFilter({
  active,
  onChange,
}: {
  active: string;
  onChange: (sector: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by sector">
      {sectors.map((sector) => {
        const isActive = active === sector;
        return (
          <button
            key={sector}
            onClick={() => onChange(sector)}
            aria-pressed={isActive}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'border-amber bg-amber text-white'
                : 'border-transparent bg-warm-gray text-text-muted hover:border-amber/50'
            }`}
          >
            {sector}
          </button>
        );
      })}
    </div>
  );
}
