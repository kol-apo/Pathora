import { auth } from '@/auth';
import DiscoverExperience from '@/components/pathy/DiscoverExperience';
import { bridgeForResult, getLatestResult } from '@/lib/db/queries/discovery';

export const metadata = { title: 'Speak with Pathy · Pathora' };
export const dynamic = 'force-dynamic';

/**
 * Career Discovery: the six questions with Pathy, then the conversation
 * about the result. The student layout has already checked sign-in, role
 * and consent.
 */
export default async function DiscoverPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const latest = await getLatestResult(userId);
  const bridge = latest ? await bridgeForResult(latest.id, userId).catch(() => null) : null;

  return (
    <main>
      <DiscoverExperience
        userId={userId}
        firstName={(session?.user?.name ?? '').split(' ')[0]}
        latest={
          latest
            ? {
                id: latest.id,
                title: latest.match.primary.title,
                sector: latest.match.primary.sector,
                mentorCount: bridge?.status === 'ready' ? bridge.mentors.length : 0,
              }
            : null
        }
      />
    </main>
  );
}
