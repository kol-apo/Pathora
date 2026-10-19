import ConsoleFrame from '@/components/console/ConsoleFrame';
import OpportunityAdmin from '@/components/console/OpportunityAdmin';
import { lastFeedUpdate, listOpportunities } from '@/lib/db/queries/opportunities';

export const metadata = { title: 'Opportunities · Admin · Pathora' };
export const dynamic = 'force-dynamic';

/** Feed listings arrive on their own; ALU SPD listings are added here. */
export default async function AdminOpportunitiesPage() {
  const [opportunities, updated] = await Promise.all([listOpportunities(), lastFeedUpdate()]);
  return (
    <ConsoleFrame
      variant="admin"
      title="Opportunities"
      subtitle="Read from four publishers' feeds, plus listings you add by hand, such as ALU SPD's."
    >
      <OpportunityAdmin opportunities={opportunities} lastUpdated={updated} />
    </ConsoleFrame>
  );
}
