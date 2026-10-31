import Link from 'next/link';
import { Star } from 'lucide-react';

/** Small shared pieces for the admin pages. */

export function Stars({ score, size = 13 }: { score: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} aria-hidden className={n <= score ? 'fill-navy text-navy' : 'text-line'} />
      ))}
    </span>
  );
}

export function Stat({ value, label, href }: { value: React.ReactNode; label: string; href?: string }) {
  const body = (
    <>
      <p className="text-[28px] font-bold tracking-[-0.02em] text-navy">{value}</p>
      <p className="mt-1 text-[13px] text-muted">{label}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-line p-5 transition hover:border-navy hover:shadow-card">
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-line p-5">{body}</div>
  );
}

export function Panel({
  title,
  note,
  children,
  flush = false,
}: {
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
  /** No inner padding, for tables that run to the edges. */
  flush?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {note && <p className="mt-0.5 text-[12.5px] text-muted">{note}</p>}
      </div>
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center text-sm text-muted">
      {children}
    </div>
  );
}

/** A participant code, or a note when the student has no code. */
export function Participant({ code }: { code: string | null }) {
  return code ? (
    <span className="font-mono text-[12.5px] text-ink">{code}</span>
  ) : (
    <span className="text-[12.5px] text-faint">No code</span>
  );
}

export const th = 'px-4 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-faint';
export const td = 'px-4 py-3 align-top text-[13.5px] text-ink';
