import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import ResultsView from '@/components/discover/ResultsView';
import { bridgeForResult, getSavedResult } from '@/lib/db/queries/discovery';

export const metadata = { title: 'Your roadmap · Pathora' };
export const dynamic = 'force-dynamic';

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * A saved discovery result, with the same three mentors it was given when it
 * was created. Only the student who owns it can open it; anyone else gets the
 * same 404 as for an id that does not exist.
 */
export default async function SavedResultPage({ params }: { params: { id: string } }) {
  // The student layout has already checked sign-in, role and consent.
  const session = await auth();
  if (!session?.user?.id) redirect('/signin');

  const result = await getSavedResult(params.id, session.user.id);
  if (!result) notFound();

  const bridge = await bridgeForResult(result.id, session.user.id).catch((err) => {
    console.error('[results] could not load the bridge:', err);
    return null;
  });

  return (
    <>
      <ResultsView
        match={result.match}
        bridge={bridge}
        resultId={result.id}
        subtitle={`Your career direction from ${dateFormat.format(new Date(result.createdAt))}.`}
      >
        <Link
          href="/discover"
          className="rounded bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
        >
          Ask Pathy about this roadmap
        </Link>
        <Link href="/dashboard" className="text-sm font-medium text-muted transition-colors hover:text-ink">
          Back to your dashboard
        </Link>
      </ResultsView>
    </>
  );
}
