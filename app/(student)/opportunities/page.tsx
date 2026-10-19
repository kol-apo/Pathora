import { auth } from '@/auth';
import { getLatestResult } from '@/lib/db/queries/discovery';
import { lastFeedUpdate, listOpportunities } from '@/lib/db/queries/opportunities';
import { FEED_SOURCES, SOURCES } from '@/lib/opportunities/sources';
import OpportunityBrowser from '@/components/opportunities/OpportunityBrowser';

export const metadata = { title: 'Opportunities · Pathora' };
export const dynamic = 'force-dynamic';

const updatedFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

/**
 * Scholarships, fellowships, internships and jobs, read from publishers'
 * feeds and from ALU SPD. Every listing links to the publisher's page.
 */
export default async function OpportunitiesPage() {
  const session = await auth();
  const now = new Date();
  const [opportunities, latest, updated] = await Promise.all([
    listOpportunities({ now }),
    session?.user?.id ? getLatestResult(session.user.id) : null,
    lastFeedUpdate(),
  ]);

  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-7 px-5 pb-16 pt-10 md:px-10">
      <header>
        <h1 className="text-[26px] font-bold tracking-[-0.03em] text-ink md:text-[30px]">Opportunities</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          Scholarships, fellowships, internships and jobs, collected from{' '}
          {FEED_SOURCES.map((s) => SOURCES[s].name).join(', ')} and ALU SPD. Each one opens on the
          publisher&apos;s site, where you apply.
        </p>
        {updated && (
          <p className="mt-1.5 text-[12.5px] text-faint">Last updated {updatedFormat.format(new Date(updated))} UTC</p>
        )}
      </header>

      <OpportunityBrowser
        opportunities={opportunities}
        mySector={latest?.match.primary.sector ?? null}
        nowIso={now.toISOString()}
      />
    </main>
  );
}
