import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import SessionRoom from '@/components/sessions/SessionRoom';
import { getSessionRoomInfo } from '@/lib/db/queries/video';

export const metadata = { title: 'Session · Pathora' };
export const dynamic = 'force-dynamic';

/**
 * The video room for one booking. Only its student and mentor can open it;
 * anyone else gets the same 404 as for a booking that does not exist.
 */
export default async function SessionPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?callbackUrl=${encodeURIComponent(`/session/${params.id}`)}`);
  const info = await getSessionRoomInfo(params.id, session.user.id);
  if (!info) notFound();
  return <SessionRoom info={info} backHref={info.role === 'mentor' ? '/mentor' : '/sessions'} />;
}
