import Link from 'next/link';
import { Star } from 'lucide-react';
import type { Consultant } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';

export default function ConsultantCard({ consultant }: { consultant: Consultant }) {
  const c = consultant;
  return (
    <article className="flex flex-col rounded-xl border bg-white p-6 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-amber/30 hover:shadow-card-hover">
      <div className="flex items-start gap-4">
        <Avatar initials={c.initials} color={c.avatarColor} size="lg" />
        <div className="min-w-0">
          <h3 className="font-fraunces text-lg font-bold text-navy">
            <Link href={`/consultants/${c.id}`} className="hover:text-amber-dark">
              {c.name}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-[13px] text-text-muted">
            {c.role} · {c.company}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <Badge variant="sector">{c.sector}</Badge>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
            c.available ? 'text-forest' : 'text-text-light'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${c.available ? 'bg-forest' : 'border border-text-light'}`}
          />
          {c.available ? 'Available' : 'Busy'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {c.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-warm-gray px-2.5 py-1 text-xs font-medium text-text-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t pt-4 text-[13px] text-text-muted">
        <span>{c.experience} years experience</span>
        <span className="inline-flex items-center gap-1">
          <Star size={13} className="fill-amber text-amber" />
          {c.rating.toFixed(1)} · {c.sessions} sessions
        </span>
      </div>

      <Link
        href={`/consultants/${c.id}`}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-amber text-sm font-semibold text-white transition-all duration-[180ms] hover:scale-[1.02] hover:bg-amber-dark active:scale-[0.98]"
      >
        Book a Session
      </Link>
    </article>
  );
}
