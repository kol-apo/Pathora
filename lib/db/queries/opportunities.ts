import { isValidObjectId } from 'mongoose';
import dbConnect from '../connect';
import { Opportunity } from '../models';
import {
  classifySector,
  classifyType,
  extractDeadline,
  parseRss,
  shorten,
  stripLeadingDeadline,
} from '@/lib/opportunities/feeds';
import {
  FEED_SOURCES,
  MANUAL_SOURCES,
  OPPORTUNITY_TYPES,
  SOURCES,
  type OpportunitySource,
  type OpportunityType,
} from '@/lib/opportunities/sources';
import { SECTORS, type Sector } from '@/lib/types';
import { DataError } from './errors';
import { toOpportunityDTO, type OpportunityDTO } from './dto';

/**
 * Opportunities: read from publishers' feeds, added by admins, listed for students.
 */

export interface RefreshReport {
  source: OpportunitySource;
  read: number;
  saved: number;
  skippedClosed: number;
  error?: string;
}

/** Who Pathora says it is when reading a feed, so publishers can see where requests come from. */
const USER_AGENT = 'PathoraBot/1.0 (career platform for African students; reads public RSS feeds)';

/**
 * Read every feed and store what is new. Listings already stored are updated
 * in place (matched by their link), so running this often never duplicates
 * anything. Listings whose deadline has passed are not stored. One feed
 * failing does not stop the others.
 *
 * Also removes listings with no real link: the sample data from before feeds
 * existed, which used "#" as a placeholder.
 */
export async function refreshOpportunities(
  options: { fetchImpl?: typeof fetch; now?: Date; timeoutMs?: number } = {},
): Promise<RefreshReport[]> {
  const { fetchImpl = fetch, now = new Date(), timeoutMs = 20_000 } = options;
  await dbConnect();
  await Opportunity.deleteMany({ url: { $not: /^https?:\/\// } });
  await Opportunity.syncIndexes();

  const reports: RefreshReport[] = [];
  for (const source of FEED_SOURCES) {
    const report: RefreshReport = { source, read: 0, saved: 0, skippedClosed: 0 };
    reports.push(report);
    try {
      const res = await fetchImpl(SOURCES[source].feed!, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml;q=0.9' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = parseRss(await res.text());
      report.read = items.length;

      for (const item of items) {
        const deadline = extractDeadline(item.summary);
        if (deadline && deadline < now) {
          report.skippedClosed++;
          continue;
        }
        await Opportunity.updateOne(
          { url: item.url },
          {
            $set: {
              title: shorten(item.title, 290),
              type: classifyType(item.title, item.categories),
              sector: classifySector(`${item.title} ${item.summary}`),
              description: shorten(stripLeadingDeadline(item.summary), 600),
              deadline,
              source,
              publishedAt: item.publishedAt ?? undefined,
            },
            // A listing an admin has hidden stays hidden on later refreshes.
            $setOnInsert: { url: item.url, organisation: '', published: true },
          },
          { upsert: true, runValidators: true },
        );
        report.saved++;
      }
    } catch (err) {
      report.error = (err as Error).message.slice(0, 200);
    }
  }
  return reports;
}

export interface OpportunityFilter {
  type?: OpportunityType;
  sector?: Sector;
  limit?: number;
  now?: Date;
}

/**
 * Open listings for students: deadline not passed (or none stated), closing
 * soonest first, then the newest. With a sector, listings open to any sector
 * are included too.
 */
export async function listOpportunities(filter: OpportunityFilter = {}): Promise<OpportunityDTO[]> {
  const { type, sector, limit = 200, now = new Date() } = filter;
  await dbConnect();
  const query: Record<string, unknown> = {
    published: true,
    $or: [{ deadline: null }, { deadline: { $gte: now } }],
  };
  if (type) query.type = type;
  if (sector) query.sector = { $in: [sector, null] };

  const docs = await Opportunity.find(query).lean();
  const time = (d: Date | null | undefined) => (d ? new Date(d).getTime() : null);
  docs.sort((a, b) => {
    const da = time(a.deadline);
    const db = time(b.deadline);
    // Dated ones first, soonest first; then undated, newest first.
    if (da !== null && db !== null) return da - db;
    if (da !== null) return -1;
    if (db !== null) return 1;
    return (time(b.publishedAt ?? b.createdAt) ?? 0) - (time(a.publishedAt ?? a.createdAt) ?? 0);
  });
  return docs.slice(0, limit).map(toOpportunityDTO);
}

export interface NewOpportunity {
  title: string;
  organisation?: string;
  type: OpportunityType;
  sector: Sector | null;
  description?: string;
  url: string;
  deadline: Date | null;
  source: OpportunitySource;
}

/** An admin adds a listing by hand, e.g. from ALU SPD. */
export async function addOpportunity(input: NewOpportunity): Promise<OpportunityDTO> {
  if (!MANUAL_SOURCES.includes(input.source)) {
    throw new DataError('INVALID_OPPORTUNITY', 'Listings from that source are read from its feed.');
  }
  if (!OPPORTUNITY_TYPES.includes(input.type) || (input.sector && !SECTORS.includes(input.sector))) {
    throw new DataError('INVALID_OPPORTUNITY', 'Unknown type or sector.');
  }
  if (!/^https?:\/\/\S+$/.test(input.url)) {
    throw new DataError('INVALID_OPPORTUNITY', 'The link must start with http:// or https://.');
  }
  await dbConnect();
  if (await Opportunity.exists({ url: input.url })) {
    throw new DataError('INVALID_OPPORTUNITY', 'That link is already listed.');
  }
  const doc = await Opportunity.create({ ...input, published: true, publishedAt: new Date() });
  return toOpportunityDTO(doc.toObject());
}

/**
 * An admin takes a listing down. Hidden rather than deleted, so a feed
 * listing does not reappear the next time the feeds are read.
 */
export async function hideOpportunity(id: string): Promise<void> {
  if (!isValidObjectId(id)) throw new DataError('INVALID_ID', 'Malformed id.');
  await dbConnect();
  const res = await Opportunity.updateOne({ _id: id }, { $set: { published: false } });
  if (res.matchedCount === 0) throw new DataError('INVALID_ID', 'No such opportunity.');
}

/** When the feeds were last read, from the newest stored feed listing. */
export async function lastFeedUpdate(): Promise<string | null> {
  await dbConnect();
  const newest = await Opportunity.findOne({ source: { $in: FEED_SOURCES } })
    .sort({ updatedAt: -1 })
    .select('updatedAt')
    .lean();
  return newest ? new Date(newest.updatedAt).toISOString() : null;
}
