import Link from 'next/link';
import { ShieldCheck, Star } from 'lucide-react';
import type { Consultant } from '@/lib/types';
import { roleLine } from '@/lib/mentors';
import { partnerFor } from '@/lib/partners';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import PartnerMark from './PartnerMark';

export default function ConsultantCard({
  consultant,
  href,
}: {
  consultant: Consultant;
  /** Where the card leads. Defaults to the profile; the bridge adds its result. */
  href?: string;
}) {
  const c = consultant;
  const bookable = c.bookable !== false;
  const available = bookable && c.nextSlot === null;
  const profileHref = href ?? `/consultants/${c.id}`;
  const partner = partnerFor(c.source);

  return (
    <article className="flex h-full flex-col gap-4 rounded-lg border border-line p-[22px] transition-colors duration-150 hover:border-faint/40">
      <div className="flex items-center gap-3.5">
        <Avatar initials={c.initials} photo={c.photo} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-semibold tracking-[-0.01em] text-ink">
              <Link href={profileHref} className="hover:underline underline-offset-2">
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
          <p className="truncate text-[13.5px] text-muted">{roleLine(c)}</p>
          {/* Its own line, so it never squeezes the name. */}
          {partner && <PartnerMark partner={partner} className="mt-0.5 self-start" />}
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

      {/* Pushes the footer down, so cards in a row line up whatever their tags. */}
      <div className="mt-auto flex flex-col gap-4">
        <div className="h-px bg-line" />

        {/* Only what is known: no "0 years", and no 0.0 rating for someone unrated. */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted">
            {c.experience !== null ? `${c.experience} years experience` : 'New to Pathora'}
          </span>
          {c.rating > 0 ? (
            <span className="flex items-center gap-[5px] text-[13px] text-ink">
              <Star size={13} className="fill-ink text-ink" aria-hidden="true" />
              {c.rating.toFixed(1)}
            </span>
          ) : (
            c.experience !== null && <span className="text-[12.5px] text-muted">New</span>
          )}
        </div>

        <div className="flex items-center gap-[7px]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${available ? 'bg-available' : 'bg-faint'}`}
            aria-hidden="true"
          />
          <span className={`text-[13px] ${available ? 'text-available' : 'text-muted'}`}>
            {!bookable ? 'Not taking bookings yet' : available ? 'Available this week' : `Next slot ${c.nextSlot}`}
          </span>
        </div>

        <Link
          href={profileHref}
          className={
            bookable
              ? 'rounded bg-navy py-[11px] text-center text-sm font-medium text-white transition-colors hover:bg-navy-deep'
              : 'rounded border border-line py-[11px] text-center text-sm font-medium text-ink transition-colors hover:bg-surface'
          }
        >
          {bookable ? 'Book a Session' : 'View profile'}
        </Link>
      </div>
    </article>
  );
}
