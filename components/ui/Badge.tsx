import type { ReactNode } from 'react';

type Variant = 'sector' | 'sector-dark' | 'tag' | 'tag-dark' | 'label' | 'urgent';

const variantClasses: Record<Variant, string> = {
  /** Uppercase micro-label on a fill chip — used for sector. */
  sector:
    'bg-fill text-ink px-2.5 py-[5px] text-micro font-semibold uppercase',
  'sector-dark':
    'bg-white/[0.07] text-white/75 px-2.5 py-[5px] text-micro font-semibold uppercase',
  /** Outlined chip for skills and focus areas. */
  tag: 'border border-line text-muted px-2.5 py-1 text-[12.5px]',
  'tag-dark': 'border border-white/[0.14] text-white/60 px-2.5 py-1 text-[12px]',
  /** Bare uppercase label, no chip. */
  label: 'text-muted text-micro font-semibold uppercase',
  urgent: 'bg-fill text-ink px-2.5 py-[5px] text-micro font-semibold uppercase',
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
      className={`inline-flex items-center gap-1.5 rounded-full ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
