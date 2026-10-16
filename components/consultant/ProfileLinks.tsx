import { BookOpen, Globe, Linkedin, Palette, PlayCircle, type LucideIcon } from 'lucide-react';
import { XLogo } from '@/components/brand/SocialIcons';
import { LINK_LABELS, displayUrl, type LinkKind } from '@/lib/profileLinks';

const KIND_ICONS: Record<LinkKind, LucideIcon> = {
  portfolio: Palette,
  publication: BookOpen,
  video: PlayCircle,
  website: Globe,
};

// Every link opens in a new tab, with no access back to Pathora's page and no
// search-ranking credit passed on, since the addresses are written by users.
const external = { target: '_blank', rel: 'noopener noreferrer nofollow ugc' } as const;

/** A consultant's LinkedIn, X and other links. Renders nothing if there are none. */
export default function ProfileLinks({
  name,
  socials,
  links = [],
}: {
  name: string;
  socials?: { linkedin?: string; x?: string };
  links?: { kind: LinkKind; url: string; title?: string }[];
}) {
  const hasSocials = !!(socials?.linkedin || socials?.x);
  if (!hasSocials && links.length === 0) return null;
  const first = name.split(' ')[0];

  return (
    <div className="space-y-3">
      {hasSocials && (
        <div className="flex flex-wrap gap-2">
          {socials?.linkedin && (
            <a
              href={socials.linkedin}
              {...external}
              className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-navy hover:bg-sky-soft"
            >
              <Linkedin size={15} className="text-navy" aria-hidden="true" />
              LinkedIn
              <span className="sr-only">: {first} on LinkedIn (opens in a new tab)</span>
            </a>
          )}
          {socials?.x && (
            <a
              href={socials.x}
              {...external}
              className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-navy hover:bg-sky-soft"
            >
              <XLogo size={13} className="text-navy" />
              X
              <span className="sr-only">: {first} on X (opens in a new tab)</span>
            </a>
          )}
        </div>
      )}

      {links.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {links.map((link) => {
            const Icon = KIND_ICONS[link.kind];
            return (
              <li key={link.url}>
                <a
                  href={link.url}
                  {...external}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-sky-soft"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-soft text-navy">
                    <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-ink">
                      {link.title || LINK_LABELS[link.kind]}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {LINK_LABELS[link.kind]} · {displayUrl(link.url)}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
