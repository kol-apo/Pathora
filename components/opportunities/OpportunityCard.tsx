import { Clock } from 'lucide-react';
import type { Opportunity } from '@/lib/types';
import Badge from '@/components/ui/Badge';

const typeColors: Record<Opportunity['type'], string> = {
  Fellowship: 'bg-amber-light text-amber-dark',
  Hackathon: 'bg-navy text-white',
  Internship: 'bg-forest-light text-forest',
  'Campus Program': 'bg-warm-gray text-text-muted',
};

export default function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const o = opportunity;
  return (
    <a
      href={o.url}
      className="block rounded-xl border bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber/30 hover:shadow-card"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.8px] ${typeColors[o.type]}`}
        >
          {o.type}
        </span>
        {o.urgent && <Badge variant="urgent">Closing soon</Badge>}
      </div>
      <p className="mt-2.5 font-fraunces text-[15px] font-bold leading-snug text-navy">
        {o.title}
      </p>
      <p className="mt-1 text-xs text-text-muted">{o.organisation}</p>
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-text-muted">
        <Clock size={12} className={o.urgent ? 'text-red-500' : 'text-text-light'} />
        {o.deadline === 'Open' ? 'Rolling applications' : `Closes in ${o.deadline}`}
      </p>
    </a>
  );
}
