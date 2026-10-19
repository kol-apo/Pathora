/**
 * Where opportunities come from.
 *
 * Four sites publish RSS feeds, which Pathora reads on a schedule: a feed is
 * the publisher's own machine-readable list, so nothing is scraped from their
 * pages. Each listing links back to the publisher's page for the details.
 * ALU SPD has no public feed; its listings are added by an admin.
 */

export const OPPORTUNITY_SOURCES = [
  'opportunitiesforafricans',
  'opportunitydesk',
  'opportunitiesforyouth',
  'youthopportunitieshub',
  'alu-spd',
  'pathora',
] as const;
export type OpportunitySource = (typeof OPPORTUNITY_SOURCES)[number];

export interface SourceInfo {
  name: string;
  homepage: string;
  /** RSS feed, for sources that are read automatically. */
  feed?: string;
}

export const SOURCES: Record<OpportunitySource, SourceInfo> = {
  opportunitiesforafricans: {
    name: 'Opportunities for Africans',
    homepage: 'https://www.opportunitiesforafricans.com',
    feed: 'https://www.opportunitiesforafricans.com/feed/',
  },
  opportunitydesk: {
    name: 'Opportunity Desk',
    homepage: 'https://opportunitydesk.org',
    feed: 'https://opportunitydesk.org/feed/',
  },
  opportunitiesforyouth: {
    name: 'Opportunities for Youth',
    homepage: 'https://opportunitiesforyouth.org',
    feed: 'https://www.opportunitiesforyouth.org/feed/',
  },
  youthopportunitieshub: {
    name: 'Youth Opportunities Hub',
    homepage: 'https://www.youthopportunitieshub.com',
    feed: 'https://youthopportunitieshub.com/feed/',
  },
  'alu-spd': { name: 'ALU SPD', homepage: 'https://www.alueducation.com' },
  pathora: { name: 'Pathora', homepage: '/' },
};

export const FEED_SOURCES = OPPORTUNITY_SOURCES.filter((s) => SOURCES[s].feed);

/** Sources an admin can post to by hand. */
export const MANUAL_SOURCES: OpportunitySource[] = ['alu-spd', 'pathora'];

export const OPPORTUNITY_TYPES = [
  'Scholarship',
  'Fellowship',
  'Internship',
  'Job',
  'Grant',
  'Competition',
  'Hackathon',
  'Conference',
  'Training',
  'Campus program',
  'Other',
] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];
