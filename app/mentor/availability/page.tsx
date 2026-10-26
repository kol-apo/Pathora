import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import ConsoleFrame from '@/components/console/ConsoleFrame';
import AvailabilityEditor from '@/components/console/AvailabilityEditor';
import { getMyAvailability } from '@/lib/db/queries/mentorConsole';
import { formatZonedDate } from '@/lib/booking/timezone';

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
      subtitle="When students can book you: your usual week, plus any dates that differ. Open slots are worked out automatically."
    >
      <AvailabilityEditor
        initial={availability.weekly}
        initialDates={availability.dates}
        initialAccepting={availability.acceptingBookings}
        timezone={availability.timezone}
        today={formatZonedDate(new Date(), availability.timezone)}
      />
    </ConsoleFrame>
  );
}
