import Link from 'next/link';
import { ShieldCheck, Star } from 'lucide-react';
import type { Consultant } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';

export default function ConsultantCard({ consultant }: { consultant: Consultant }) {
  const c = consultant;
  const available = c.nextSlot === null;

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-line p-[22px] transition-colors duration-150 hover:border-faint/40">
      <div className="flex items-center gap-3.5">
        <Avatar initials={c.initials} size="lg" />
        <div className="flex min-w-0 flex-col gap-[5px]">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-semibold tracking-[-0.01em] text-ink">
              <Link href={`/consultants/${c.id}`} className="hover:underline underline-offset-2">
                {c.name}
              </Link>
            </h3>
            <ShieldCheck
              size={14}
              strokeWidth={1.5}
              className="shrink-0 text-muted"
              aria-label="Vetted by Pathora"
            />
          </div>
          <p className="truncate text-[13.5px] text-muted">
            {c.role} · {c.company}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-[7px]">
        <Badge variant="sector">{c.sector}</Badge>
        {c.focus.map((f) => (
          <Badge key={f} variant="tag">
            {f}
          </Badge>
        ))}
      </div>

      <div className="h-px bg-line" />

      <div className="flex items-center justify-between">
        <span className="text-[13px] text-muted">{c.experience} years experience</span>
        <span className="flex items-center gap-[5px] text-[13px] text-ink">
          <Star size={13} className="fill-ink text-ink" aria-hidden="true" />
          {c.rating.toFixed(1)}
        </span>
      </div>

      <div className="flex items-center gap-[7px]">
        <span
          className={`h-1.5 w-1.5 rounded-full ${available ? 'bg-available' : 'bg-faint'}`}
          aria-hidden="true"
        />
        <span className={`text-[13px] ${available ? 'text-available' : 'text-muted'}`}>
          {available ? 'Available this week' : `Next slot ${c.nextSlot}`}
        </span>
      </div>

      <Link
        href={`/consultants/${c.id}`}
        className="rounded bg-ink-soft py-[11px] text-center text-sm font-medium text-white transition-colors hover:bg-black"
      >
        Book a Session
      </Link>
    </article>
  );
}
