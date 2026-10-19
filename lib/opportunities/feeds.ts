import type { Sector } from '@/lib/types';
import type { OpportunityType } from './sources';

/**
 * Reading opportunity feeds. Pure functions: no network, no database, so
 * `npm run verify` can check them against fixed samples.
 *
 * Feeds are untrusted input. Everything here strips markup and keeps only
 * plain text and http(s) links, so nothing from a feed can reach a page as HTML.
 */

export interface FeedItem {
  title: string;
  url: string;
  publishedAt: Date | null;
  categories: string[];
  /** Plain-text summary, without the publisher's "The post ... appeared first on" line. */
  summary: string;
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Markup to plain text: CDATA unwrapped, tags removed, entities decoded, spaces collapsed. */
export function toPlainText(value: string): string {
  const unwrapped = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // Decode first so encoded tags (&lt;p&gt;) are removed too.
  return decodeEntities(decodeEntities(unwrapped))
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block: string, name: string): string {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(block);
  return m ? m[1] : '';
}

/** Parse an RSS 2.0 document. Items without a title or an http(s) link are dropped. */
export function parseRss(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  for (const [, block] of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const title = toPlainText(tag(block, 'title'));
    const url = toPlainText(tag(block, 'link'));
    if (!title || !/^https?:\/\/\S+$/i.test(url)) continue;

    const date = new Date(toPlainText(tag(block, 'pubDate')));
    const categories = [...block.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)]
      .map(([, c]) => toPlainText(c))
      .filter(Boolean);
    const summary = toPlainText(tag(block, 'description'))
      .replace(/\s*The post .+? appeared first on .+?\.?$/i, '')
      .replace(/\s*\[(?:…|\.\.\.)\]\s*$/, '…')
      .trim();

    items.push({
      title,
      url,
      publishedAt: Number.isNaN(date.getTime()) ? null : date,
      categories,
      summary,
    });
  }
  return items;
}

/** A written date: "October 30, 2026" or "25th of October, 2026". */
const DATE = String.raw`(?:[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?[a-z]+,?\s+\d{4})`;

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * The application deadline, when the text states one plainly: "Deadline:
 * October 30, 2026" or "Application Deadline: 25th October, 2026". Anything
 * vaguer gives null, and the page says to check the publisher's site rather
 * than guess. Taken as the end of that day, UTC.
 */
export function extractDeadline(text: string): Date | null {
  const m = /(?:deadline|closing date)\s*(?:is|:)?\s*:?\s*(?:[a-z]+day,?\s+)?([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?[a-z]+,?\s+\d{4})/i.exec(
    text,
  );
  if (!m) return null;

  const parts = m[1].replace(/,|(?<=\d)(st|nd|rd|th)|\bof\b/gi, ' ').split(/\s+/).filter(Boolean);
  const year = Number(parts.find((p) => /^\d{4}$/.test(p)));
  const day = Number(parts.find((p) => /^\d{1,2}$/.test(p)));
  const month = MONTHS.indexOf((parts.find((p) => /^[a-z]+$/i.test(p)) ?? '').slice(0, 3).toLowerCase());
  if (month < 0 || !day || day > 31 || !year) return null;

  const date = new Date(Date.UTC(year, month, day, 23, 59, 0));
  // Reject impossible dates such as 31 November, which Date rolls into December.
  return date.getUTCMonth() === month ? date : null;
}

/** Ordered: the first rule that matches the title, then the categories, wins. */
const TYPE_RULES: [OpportunityType, RegExp][] = [
  ['Hackathon', /hackathon/i],
  ['Scholarship', /scholarship|bursar(y|ies)|fully[- ]funded (degree|masters|phd)/i],
  ['Fellowship', /fellowship/i],
  ['Internship', /internship|\bintern\b|apprentice|learner(ship)? programme|graduate (programme|program|trainee)/i],
  ['Grant', /\bgrants?\b|call for proposals|funding|seed fund/i],
  ['Competition', /competition|challenge|\bawards?\b|\bprize\b|contest/i],
  ['Conference', /conference|summit|forum|congress/i],
  ['Training', /\bcourse\b|training|certificate|bootcamp|workshop|masterclass|academy/i],
  ['Job', /\bjobs?\b|careers?\b|vacanc(y|ies)|recruitment|hiring|young professionals programme/i],
  ['Campus program', /campus (ambassador|program|leader)|student ambassador/i],
];

export function classifyType(title: string, categories: string[]): OpportunityType {
  for (const source of [title, categories.join(' · ')]) {
    for (const [type, pattern] of TYPE_RULES) {
      if (pattern.test(source)) return type;
    }
  }
  return 'Other';
}

const SECTOR_WORDS: Record<Sector, RegExp> = {
  Technology: /\b(tech|technology|software|data|ai|artificial intelligence|machine learning|coding|developer|digital|cyber|computer|engineering|stem|it)\b/gi,
  Finance: /\b(finance|banking|bank|economics|accounting|investment|audit|insurance|actuarial)\b/gi,
  Creative: /\b(arts?|design|film|music|creative|writing|writers|journalism|journalists|media|photography|fashion|storytelling)\b/gi,
  Entrepreneurship: /\b(entrepreneurs?|entrepreneurship|startups?|start-ups?|founders?|business|agripreneurs?|venture|enterprise|leadership)\b/gi,
};

/**
 * The sector an opportunity most clearly belongs to, or null when it is open
 * to everyone or the text is ambiguous. A tie gives null rather than a guess.
 */
export function classifySector(text: string): Sector | null {
  const scores = (Object.keys(SECTOR_WORDS) as Sector[]).map((s) => ({
    sector: s,
    hits: (text.match(SECTOR_WORDS[s]) ?? []).length,
  }));
  scores.sort((a, b) => b.hits - a.hits);
  if (scores[0].hits === 0 || scores[0].hits === scores[1].hits) return null;
  return scores[0].sector;
}

/**
 * Drop an opening "Application Deadline: 25th October, 2026 5 pm BST (UK time)"
 * from a summary: the deadline is shown in its own column.
 */
export function stripLeadingDeadline(summary: string): string {
  const opener = new RegExp(
    String.raw`^(?:application\s+)?(?:deadline|closing date)\s*(?:is|:)?\s*:?\s*(?:[a-z]+day,?\s+)?${DATE}`,
    'i',
  ).exec(summary);
  if (!opener) return summary;

  // Cut exactly where the date ends, then drop what commonly trails it.
  let rest = summary.slice(opener[0].length);
  const trailing = [
    // A time and zone. Case-sensitive on purpose: the zone is capitals
    // ("BST"), so it cannot swallow the first letters of the next sentence.
    /^\s*\d{1,2}(:\d{2})?\s*[aApP][mM]\b(\s*[A-Z]{2,5}\b)?/,
    /^\s*\([^)]*\)/, // "(UK time)", "(Int'l applicants)"
    new RegExp(String.raw`^\s*/\s*${DATE}`, 'i'), // "/ February 1, 2027"
  ];
  for (let changed = true; changed; ) {
    changed = false;
    for (const re of trailing) {
      const m = re.exec(rest);
      if (m) {
        rest = rest.slice(m[0].length);
        changed = true;
      }
    }
  }
  return rest.trim();
}

/** A summary short enough for a list row, cut at a word boundary. */
export function shorten(text: string, max = 280): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 30)).trim()}…`;
}
