/**
 * A mentor's public links: LinkedIn, X, and up to five others (portfolio,
 * publications, videos, a website).
 *
 * Shared by the forms (to tidy what people type) and the server (which never
 * trusts the form). Only http(s) addresses are accepted, so a "javascript:"
 * link can never be stored and later clicked by a student.
 */

export const LINK_KINDS = ['portfolio', 'publication', 'video', 'website'] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const LINK_LABELS: Record<LinkKind, string> = {
  portfolio: 'Portfolio',
  publication: 'Publication',
  video: 'Video',
  website: 'Website',
};

export const MAX_LINKS = 5;
export const MAX_LINK_TITLE = 60;

export interface MentorLink {
  kind: LinkKind;
  url: string;
  /** Optional title, e.g. the name of a paper or talk. */
  title?: string;
}

export interface MentorSocials {
  linkedin?: string;
  x?: string;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** A web address, with "https://" added if it was left off. Null if not a valid http(s) address. */
export function normaliseUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const hostIs = (url: string, domain: string) => {
  const host = new URL(url).hostname.toLowerCase();
  return host === domain || host.endsWith(`.${domain}`);
};

/** A LinkedIn profile address. Empty input is fine (the field is optional). */
export function normaliseLinkedIn(input: string): Result<string | undefined> {
  if (!input.trim()) return { ok: true, value: undefined };
  const url = normaliseUrl(input);
  if (!url || !hostIs(url, 'linkedin.com')) {
    return { ok: false, error: 'LinkedIn must be a linkedin.com address, e.g. linkedin.com/in/your-name.' };
  }
  return { ok: true, value: url };
}

/** An X (Twitter) profile: a full address, or just "@handle". */
export function normaliseX(input: string): Result<string | undefined> {
  const raw = input.trim();
  if (!raw) return { ok: true, value: undefined };
  const handle = raw.replace(/^@/, '');
  if (/^[A-Za-z0-9_]{1,15}$/.test(handle)) return { ok: true, value: `https://x.com/${handle}` };
  const url = normaliseUrl(raw);
  if (!url || !(hostIs(url, 'x.com') || hostIs(url, 'twitter.com'))) {
    return { ok: false, error: 'X must be an x.com address or a handle such as @yourname.' };
  }
  return { ok: true, value: url };
}

/** Check and tidy the socials and other links together. Blank rows are dropped. */
export function cleanProfileLinks(input: {
  socials?: { linkedin?: string; x?: string };
  links?: { kind: string; url: string; title?: string }[];
}): Result<{ socials: MentorSocials; links: MentorLink[] }> {
  const linkedin = normaliseLinkedIn(input.socials?.linkedin ?? '');
  if (!linkedin.ok) return linkedin;
  const x = normaliseX(input.socials?.x ?? '');
  if (!x.ok) return x;

  const rows = (input.links ?? []).filter((l) => l.url.trim());
  if (rows.length > MAX_LINKS) return { ok: false, error: `Add at most ${MAX_LINKS} other links.` };

  const links: MentorLink[] = [];
  for (const row of rows) {
    if (!(LINK_KINDS as readonly string[]).includes(row.kind)) {
      return { ok: false, error: 'Choose what each link is.' };
    }
    const url = normaliseUrl(row.url);
    if (!url) return { ok: false, error: `“${row.url.trim()}” is not a valid web address.` };
    const title = row.title?.trim().slice(0, MAX_LINK_TITLE) || undefined;
    links.push({ kind: row.kind as LinkKind, url, title });
  }

  return { ok: true, value: { socials: { linkedin: linkedin.value, x: x.value }, links } };
}

/** "https://www.example.com/work/" -> "example.com/work", for display. */
export function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    return `${u.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    return url;
  }
}
