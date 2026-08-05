import Link from 'next/link';
import type { Consultant } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';

/** The dashboard list row — a flat row inside a bordered panel, not a card. */
export default function ConsultantCardCompact({ consultant }: { consultant: Consultant }) {
  const c = consultant;
  return (
    <div className="flex items-center gap-3.5 px-5 py-4">
      <Avatar initials={c.initials} size="sm" />
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <Link
          href={`/consultants/${c.id}`}
          className="truncate text-sm font-medium text-ink hover:underline underline-offset-2"
        >
          {c.name}
        </Link>
        <span className="truncate text-[12.5px] text-muted">
          {c.role} · {c.company}
        </span>
      </div>
      <Link
        href={`/consultants/${c.id}`}
        className="shrink-0 rounded border border-line px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
      >
        Book
      </Link>
    </div>
  );
}
