'use client';

import { NOTICE_OPTIONS, noticeLabel, noticeOf, type MentorStatus } from './shared';

/**
 * What students see right now, worked out from the saved hours (the page
 * reloads after a save), plus the two booking switches: accepting new
 * bookings, and the minimum notice.
 */
export function bookingStatus(input: {
  status: MentorStatus;
  accepting: boolean;
  hasHours: boolean;
  nextSlotLabel: string | null;
  noticeHours: number;
  horizonDays: number;
  timezone: string;
}): { bookable: boolean; title: string; detail: string } {
  const { status, accepting, hasHours, nextSlotLabel, noticeHours, horizonDays, timezone } = input;
  if (status === 'approved' && accepting && nextSlotLabel !== null) {
    return {
      bookable: true,
      title: 'Students can book you',
      detail: `The next time they can book is ${nextSlotLabel} (${timezone}).`,
    };
  }
  if (status === 'pending_review') {
    return {
      bookable: false,
      title: 'Waiting for approval',
      detail: 'An admin is reviewing your profile. Students will see your hours once it is approved.',
    };
  }
  if (status !== 'approved') {
    return {
      bookable: false,
      title: 'Your profile is hidden from students',
      detail: 'Contact the Pathora team if you think this is a mistake.',
    };
  }
  const detail = !accepting
    ? 'You have paused new bookings. Turn "Accepting new bookings" back on and save.'
    : !hasHours
      ? 'Add the hours you are free below, then save.'
      : `None of your saved hours are open: each needs ${noticeOf(noticeHours)}, and students can book up to ${horizonDays} days ahead. Add later hours or shorten the notice.`;
  return { bookable: false, title: 'Students cannot book you yet', detail };
}

export default function BookingStatusCard({
  title,
  detail,
  bookable,
  accepting,
  onAccepting,
  notice,
  savedNotice,
  onNotice,
}: {
  title: string;
  detail: string;
  bookable: boolean;
  accepting: boolean;
  onAccepting: (on: boolean) => void;
  notice: number;
  /** The notice saved now: kept as an option even if it is not in the list. */
  savedNotice: number;
  onNotice: (hours: number) => void;
}) {
  return (
    <section className="rounded-xl border border-line">
      <div
        role="status"
        aria-label="Booking status"
        className={`flex items-start gap-3 rounded-t-xl px-5 py-4 ${bookable ? 'bg-sky-soft' : 'bg-surface'}`}
      >
        <span
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${bookable ? 'bg-available' : 'bg-faint'}`}
          aria-hidden
        />
        <div>
          <p className="text-[15px] font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-[13.5px] text-muted">{detail}</p>
        </div>
      </div>
      <div className="divide-y divide-line border-t border-line">
        <label className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
          <span>
            <span className="block text-[14px] font-medium text-ink">Accepting new bookings</span>
            <span className="text-[13px] text-muted">Turn this off to pause new requests without changing your hours.</span>
          </span>
          <input
            type="checkbox"
            checked={accepting}
            onChange={(e) => onAccepting(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-[#1D3F5A]"
          />
        </label>
        <label className="flex items-center justify-between gap-4 px-5 py-4">
          <span>
            <span className="block text-[14px] font-medium text-ink">Minimum notice</span>
            <span className="text-[13px] text-muted">
              How soon before a session students can still book it. You confirm each request.
            </span>
          </span>
          <select
            value={notice}
            onChange={(e) => onNotice(Number(e.target.value))}
            className="h-10 shrink-0 rounded border border-line bg-white px-3 text-[14px] text-ink focus:border-navy focus:outline-none"
          >
            {!NOTICE_OPTIONS.some((o) => o.hours === savedNotice) && (
              <option value={savedNotice}>{noticeLabel(savedNotice)}</option>
            )}
            {NOTICE_OPTIONS.map((o) => (
              <option key={o.hours} value={o.hours}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
