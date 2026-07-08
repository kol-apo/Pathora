import Link from 'next/link';
import type { Consultant } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';

export default function ConsultantCardCompact({ consultant }: { consultant: Consultant }) {
  const c = consultant;
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber/30 hover:shadow-card">
      <Avatar initials={c.initials} color={c.avatarColor} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-fraunces text-[15px] font-bold text-navy">{c.name}</p>
        <p className="truncate text-xs text-text-muted">
          {c.role} · {c.company}
        </p>
        <Badge variant="sector" className="mt-1.5">
          {c.sector}
        </Badge>
      </div>
      <Link
        href={`/consultants/${c.id}`}
        className="shrink-0 rounded-[10px] bg-amber px-4 py-2 text-xs font-semibold text-white transition-all duration-[180ms] hover:scale-[1.02] hover:bg-amber-dark active:scale-[0.98]"
      >
        Book
      </Link>
    </div>
  );
}
