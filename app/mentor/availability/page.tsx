import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import ConsoleFrame from '@/components/console/ConsoleFrame';
import AvailabilityEditor from '@/components/console/AvailabilityEditor';
import { getMyAvailability } from '@/lib/db/queries/mentorConsole';

export const metadata = { title: 'Availability · Mentor · Pathora' };
export const dynamic = 'force-dynamic';

export default async function MentorAvailabilityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/mentor/availability');

  const availability = await getMyAvailability(session.user.id);
  if (!availability) redirect('/become-a-mentor');

  return (
    <ConsoleFrame
      variant="mentor"
      title="Availability"
      subtitle="When students can book you. Open slots are worked out from these hours automatically."
    >
      <AvailabilityEditor
        initial={availability.weekly}
        initialAccepting={availability.acceptingBookings}
        timezone={availability.timezone}
      />
    </ConsoleFrame>
  );
}
