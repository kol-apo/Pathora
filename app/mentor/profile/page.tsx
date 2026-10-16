import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import ConsoleFrame from '@/components/console/ConsoleFrame';
import ProfileLinksForm from '@/components/console/ProfileLinksForm';
import { getMyLinks } from '@/lib/db/queries/mentorConsole';

export const metadata = { title: 'Profile links · Mentor · Pathora' };
export const dynamic = 'force-dynamic';

export default async function MentorProfileLinksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/mentor/profile');

  const current = await getMyLinks(session.user.id);
  if (!current) redirect('/become-a-mentor');

  return (
    <ConsoleFrame
      variant="mentor"
      title="Profile links"
      subtitle="Your LinkedIn, X, portfolio, publications and videos, shown on your public profile."
    >
      <ProfileLinksForm
        initial={{
          linkedin: current.socials.linkedin ?? '',
          x: current.socials.x ?? '',
          links: current.links.map((l) => ({ kind: l.kind, url: l.url, title: l.title ?? '' })),
        }}
      />
    </ConsoleFrame>
  );
}
