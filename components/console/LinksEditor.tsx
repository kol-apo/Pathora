'use client';

import { useId } from 'react';
import { Linkedin, Plus, Trash2 } from 'lucide-react';
import { XLogo } from '@/components/brand/SocialIcons';
import { LINK_KINDS, LINK_LABELS, MAX_LINKS, type LinkKind } from '@/lib/profileLinks';

export interface LinksValue {
  linkedin: string;
  x: string;
  links: { kind: LinkKind; url: string; title: string }[];
}

export const emptyLinks = (): LinksValue => ({ linkedin: '', x: '', links: [] });

/** Turn a form value into the request body the API expects. */
export const linksPayload = (v: LinksValue) => ({
  socials: { linkedin: v.linkedin, x: v.x },
  links: v.links.map((l) => ({ kind: l.kind, url: l.url, title: l.title })),
});

const input =
  'h-11 w-full rounded border border-line bg-white px-3.5 text-[14.5px] text-ink placeholder:text-faint focus:border-navy focus:outline-none';

/** LinkedIn, X, and up to five other links (portfolio, publication, video, website). */
export default function LinksEditor({ value, onChange }: { value: LinksValue; onChange: (v: LinksValue) => void }) {
  const id = useId();
  const setLink = (i: number, patch: Partial<LinksValue['links'][number]>) =>
    onChange({ ...value, links: value.links.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-li`} className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
            <Linkedin size={15} className="text-navy" aria-hidden="true" />
            LinkedIn
          </label>
          <input
            id={`${id}-li`}
            value={value.linkedin}
            onChange={(e) => onChange({ ...value, linkedin: e.target.value })}
            placeholder="linkedin.com/in/your-name"
            inputMode="url"
            className={`${input} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor={`${id}-x`} className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
            <XLogo size={13} className="text-navy" />
            X
          </label>
          <input
            id={`${id}-x`}
            value={value.x}
            onChange={(e) => onChange({ ...value, x: e.target.value })}
            placeholder="@yourname or x.com/yourname"
            className={`${input} mt-1.5`}
          />
        </div>
      </div>

      <div>
        <p className="text-[13.5px] font-medium text-ink">Other links</p>
        <p className="mt-0.5 text-[12.5px] text-muted">
          Your portfolio, publications, talks or videos, or a personal website. Up to {MAX_LINKS}.
        </p>
        <div className="mt-3 space-y-2.5">
          {value.links.map((link, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[140px_1fr_1fr_auto] sm:items-center sm:border-0 sm:p-0">
              <select
                value={link.kind}
                onChange={(e) => setLink(i, { kind: e.target.value as LinkKind })}
                aria-label={`Link ${i + 1} type`}
                className={input}
              >
                {LINK_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {LINK_LABELS[k]}
                  </option>
                ))}
              </select>
              <input
                value={link.url}
                onChange={(e) => setLink(i, { url: e.target.value })}
                placeholder="https://"
                inputMode="url"
                aria-label={`Link ${i + 1} address`}
                className={input}
              />
              <input
                value={link.title}
                onChange={(e) => setLink(i, { title: e.target.value })}
                placeholder="Title (optional)"
                maxLength={60}
                aria-label={`Link ${i + 1} title`}
                className={input}
              />
              <button
                type="button"
                onClick={() => onChange({ ...value, links: value.links.filter((_, j) => j !== i) })}
                aria-label={`Remove link ${i + 1}`}
                className="justify-self-start rounded p-2.5 text-faint transition-colors hover:bg-surface hover:text-ink"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        {value.links.length < MAX_LINKS && (
          <button
            type="button"
            onClick={() => onChange({ ...value, links: [...value.links, { kind: 'portfolio', url: '', title: '' }] })}
            className="mt-3 flex items-center gap-1.5 rounded px-3 py-2 text-[13.5px] font-medium text-navy transition-colors hover:bg-sky-soft"
          >
            <Plus size={15} />
            Add a link
          </button>
        )}
      </div>
    </div>
  );
}
