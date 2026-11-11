import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import ConsoleFrame from '@/components/console/ConsoleFrame';
import ProfileLinksForm from '@/components/console/ProfileLinksForm';
import PhotoUploader from '@/components/console/PhotoUploader';
import { cloudinaryConfig } from '@/lib/media/cloudinary';
import { getMentorSelf, getMyLinks } from '@/lib/db/queries/mentorConsole';
import { initialsFor } from '@/lib/db/queries/accounts';

export const metadata = { title: 'Profile · Mentor · Pathora' };
export const dynamic = 'force-dynamic';

export default async function MentorProfileLinksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/mentor/profile');

  const [current, self] = await Promise.all([getMyLinks(session.user.id), getMentorSelf(session.user.id)]);
  if (!current || !self) redirect('/become-a-mentor');

  return (
    <ConsoleFrame
      variant="mentor"
      title="Profile"
      subtitle="Your photo and links, shown to students on your card and public profile."
    >
      <PhotoUploader photo={self.photo} initials={initialsFor(self.displayName)} enabled={cloudinaryConfig() !== null} />
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
