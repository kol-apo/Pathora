"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { BookingDTO, MentorDTO } from "@/lib/db/queries/dto";
import Avatar from "@/components/ui/Avatar";
import CancelBookingButton from "@/components/dashboard/CancelBookingButton";
import { roleLine } from "@/lib/mentors";
import RateSession, { RatedStars } from "./RateSession";

type Session = BookingDTO & { mentor: MentorDTO };

const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const dayNum = new Intl.DateTimeFormat("en-GB", { day: "numeric" });
const month = new Intl.DateTimeFormat("en-GB", { month: "short" });
const time = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});
/** YYYY-MM-DD in the viewer's own timezone. */
const dayKey = (d: Date) => d.toLocaleDateString("en-CA");

/** What a session's state means to the student, in words. */
function statusOf(
  s: Session,
  now: Date,
): { label: string; tone: "ok" | "wait" | "off" } {
  const first = s.mentor.displayName.split(" ")[0];
  const over = new Date(s.endsAt) < now;
  switch (s.status) {
    case "confirmed":
      return over
        ? { label: "Ended", tone: "off" }
        : { label: "Confirmed", tone: "ok" };
    case "pending":
      return over
        ? { label: "Not confirmed in time", tone: "off" }
        : { label: `Waiting for ${first} to confirm`, tone: "wait" };
    case "completed":
      return { label: "Completed", tone: "off" };
    case "cancelled":
      return { label: "Cancelled", tone: "off" };
    case "no_show":
      return { label: "Did not take place", tone: "off" };
  }
}

/** The video room is open from 10 minutes before the start until 15 minutes after the end. */
const opensSoon = (s: Session, now: Date) =>
  now.getTime() >= Date.parse(s.startsAt) - 10 * 60_000 &&
  now.getTime() <= Date.parse(s.endsAt) + 15 * 60_000;

const toneClass = {
  ok: "bg-available/10 text-available",
  wait: "bg-sky-soft text-navy",
  off: "bg-fill text-muted",
} as const;

function SessionRow({
  s,
  now,
  past = false,
}: {
  s: Session;
  now: Date;
  past?: boolean;
}) {
  const start = new Date(s.startsAt);
  const status = statusOf(s, now);
  const canCancel =
    !past &&
    (s.status === "pending" || s.status === "confirmed") &&
    start > now;
  const ended = new Date(s.endsAt) <= now;
  const canRate =
    ended &&
    !s.rating &&
    (s.status === "completed" || s.status === "confirmed");
  return (
    <li className="flex flex-col gap-3 px-5 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div
          className={`flex w-14 shrink-0 flex-col items-center rounded-lg border py-1.5 ${
            past ? "border-line" : "border-sky-muted bg-sky-soft"
          }`}
        >
          <span className="text-[11px] font-medium uppercase text-muted">
            {weekday.format(start)}
          </span>
          <span className="text-[19px] font-semibold leading-tight text-ink">
            {dayNum.format(start)}
          </span>
          <span className="text-[11px] text-muted">{month.format(start)}</span>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar
            initials={s.mentor.initials}
            photo={s.mentor.photo}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-medium text-ink">
              <Link
                href={`/consultants/${s.mentor.id}`}
                className="hover:underline underline-offset-2"
              >
                {s.mentor.displayName}
              </Link>
              <span className="font-normal text-muted">
                {" "}
                · {time.format(start)}
              </span>
            </p>
            <p className="truncate text-[13px] text-muted">
              {s.topic} · {roleLine(s.mentor)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:justify-end">
          <span
            className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${toneClass[status.tone]}`}
          >
            {status.label}
          </span>
          {!past && s.status === "confirmed" && (
            <Link
              href={`/session/${s.id}`}
              className={
                opensSoon(s, now)
                  ? "rounded bg-navy px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-navy-deep"
                  : "rounded border border-line px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
              }
            >
              {opensSoon(s, now) ? "Join" : "Session room"}
            </Link>
          )}
          {canCancel && (
            <CancelBookingButton
              bookingId={s.id}
              mentorFirstName={s.mentor.displayName.split(" ")[0]}
            />
          )}
        </div>
      </div>
      {s.rating ? (
        <div className="sm:pl-[72px]">
          <RatedStars score={s.rating.score} />
        </div>
      ) : (
        canRate && (
          <div className="sm:pl-[72px]">
            <RateSession
              bookingId={s.id}
              mentorFirstName={s.mentor.displayName.split(" ")[0]}
            />
          </div>
        )
      )}
    </li>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {hint && <span className="text-[12.5px] text-muted">{hint}</span>}
      </div>
      <ul className="flex flex-col divide-y divide-line">{children}</ul>
    </section>
  );
}

/**
 * Sessions grouped into today, coming up, and past, by the viewer's own
 * calendar. Grouped after the page loads, because the server does not know
 * the viewer's timezone and "today" depends on it.
 */
export default function SessionsBoard({ bookings }: { bookings: Session[] }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
        <CalendarDays size={26} strokeWidth={1.5} className="text-faint" />
        <p className="mt-3 text-[15px] font-medium text-ink">No sessions yet</p>
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
          Pick a mentor, choose a time that suits you both, and it will show up
          here.
        </p>
        <Link
          href="/explore"
          className="mt-5 rounded bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
        >
          Find a mentor
        </Link>
      </div>
    );
  }
  if (!now)
    return (
      <div
        className="h-40 animate-pulse rounded-lg border border-line"
        aria-busy="true"
      />
    );

  const today = dayKey(now);
  const live = (s: Session) =>
    s.status === "pending" || s.status === "confirmed";
  const byStart = (a: Session, b: Session) =>
    a.startsAt.localeCompare(b.startsAt);

  const todays = bookings
    .filter(
      (s) =>
        live(s) &&
        dayKey(new Date(s.startsAt)) === today &&
        new Date(s.endsAt) >= now,
    )
    .sort(byStart);
  const upcoming = bookings
    .filter((s) => live(s) && dayKey(new Date(s.startsAt)) > today)
    .sort(byStart);
  const past = bookings
    .filter((s) => !todays.includes(s) && !upcoming.includes(s))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[13.5px] text-muted">
        <span className="font-medium text-ink">{todays.length}</span> today ·{" "}
        <span className="font-medium text-ink">{upcoming.length}</span> coming
        up · <span className="font-medium text-ink">{past.length}</span> past
      </p>

      <Group
        title="Today"
        hint={
          todays.length
            ? "The call opens 10 minutes before each session."
            : undefined
        }
      >
        {todays.length ? (
          todays.map((s) => <SessionRow key={s.id} s={s} now={now} />)
        ) : (
          <li className="px-5 py-5 text-[13.5px] text-muted">Nothing today.</li>
        )}
      </Group>

      <Group title="Coming up">
        {upcoming.length ? (
          upcoming.map((s) => <SessionRow key={s.id} s={s} now={now} />)
        ) : (
          <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 text-[13.5px] text-muted">
            Nothing booked yet.
            <Link
              href="/explore"
              className="font-medium text-ink underline underline-offset-2"
            >
              Book a session
            </Link>
          </li>
        )}
      </Group>

      {past.length > 0 && (
        <Group title="Past">
          {past.map((s) => (
            <SessionRow key={s.id} s={s} now={now} past />
          ))}
        </Group>
      )}
    </div>
  );
}
