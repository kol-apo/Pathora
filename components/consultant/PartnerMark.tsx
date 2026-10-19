import { Handshake } from 'lucide-react';
import type { Partner } from '@/lib/partners';

/**
 * The quiet "from a partner" mark on a mentor card or profile: one small pill
 * in a fixed place, so it reads as provenance rather than another tag.
 *
 * `compact` is the card version (just the partner's name); the full version
 * on the profile spells it out.
 */
export default function PartnerMark({
  partner,
  compact = true,
  className = '',
}: {
  partner: Partner;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      title={partner.description}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky-muted bg-sky-soft font-medium text-navy ${
        compact ? 'px-2 py-[3px] text-[11.5px]' : 'px-2.5 py-1 text-[12.5px]'
      } ${className}`}
    >
      <Handshake size={compact ? 12 : 13} strokeWidth={1.75} aria-hidden="true" />
      {compact ? partner.name : `Mentor from ${partner.name}`}
      {compact && <span className="sr-only"> partner mentor</span>}
    </span>
  );
}
