import type { ReactNode } from 'react';

type Variant = 'sector' | 'type' | 'status-available' | 'status-busy' | 'match-strong' | 'match-good' | 'urgent';

const variantClasses: Record<Variant, string> = {
  sector: 'bg-amber-light text-amber-dark',
  type: 'bg-forest-light text-forest',
  'status-available': 'bg-forest-light text-forest',
  'status-busy': 'bg-warm-gray text-text-muted',
  'match-strong': 'bg-amber/20 text-amber-dark',
  'match-good': 'bg-navy text-white',
  urgent: 'bg-red-50 text-red-600',
};

export default function Badge({
  variant = 'sector',
  className = '',
  children,
}: {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.8px] ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
