import type { Email } from './send';

/**
 * The words of each booking email. Pure functions: no database, no sending,
 * so every message can be checked in the offline tests.
 *
 * Students are named by first name only, as everywhere a mentor sees them.
 * Times are written in the reader's own timezone: the mentor's from their
 * profile, the student's from their browser when they booked (UTC if unknown).
 */

export interface BookingFacts {
  bookingId: string;
  startsAt: Date;
  topic: string;
  student: { name: string; email: string; timeZone?: string };
  mentor: { name: string; email: string; timeZone: string };
  /** The site's address, e.g. https://usepathora.vercel.app */
  appUrl: string;
}

const first = (name: string) => name.trim().split(/\s+/)[0] || 'there';

/** "Tuesday 12 November, 14:00 (Africa/Lagos time)" */
export function when(date: Date, timeZone = 'UTC'): string {
  const text = date.toLocaleString('en-GB', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `${text.replace(' at ', ', ')} (${timeZone === 'UTC' ? 'UTC' : `${timeZone} time`})`;
}

const SIGN_OFF = 'The Pathora team';

/** To the mentor: a student has asked for a session. */
export function newRequestEmail(f: BookingFacts): Email {
  const s = first(f.student.name);
  return {
    to: f.mentor.email,
    toName: f.mentor.name,
    subject: `New session request from ${s}`,
    text: `Hi ${first(f.mentor.name)},

${s} has asked for a free 45-minute session with you on ${when(f.startsAt, f.mentor.timeZone)}.

What they want to talk about: ${f.topic}

Please confirm or decline it in your mentor console, so ${s} knows where they stand:
${f.appUrl}/mentor

${SIGN_OFF}`,
  };
}

/** To the student: the mentor confirmed. */
export function confirmedEmail(f: BookingFacts): Email {
  return {
    to: f.student.email,
    toName: f.student.name,
    subject: `Your session with ${f.mentor.name} is confirmed`,
    text: `Hi ${first(f.student.name)},

${f.mentor.name} has confirmed your session on ${when(f.startsAt, f.student.timeZone)}.

Join the video call here. It opens 10 minutes before the start:
${f.appUrl}/session/${f.bookingId}

If you can no longer make it, please cancel from your Sessions page so the time frees up for someone else:
${f.appUrl}/sessions

${SIGN_OFF}`,
  };
}

/** To the student: the mentor declined. */
export function declinedEmail(f: BookingFacts): Email {
  return {
    to: f.student.email,
    toName: f.student.name,
    subject: `${f.mentor.name} can't make your requested session`,
    text: `Hi ${first(f.student.name)},

${f.mentor.name} isn't able to take your session on ${when(f.startsAt, f.student.timeZone)}.

You can pick another time with them, or book another mentor in the same field:
${f.appUrl}/explore

${SIGN_OFF}`,
  };
}

/** To the mentor: the student cancelled. */
export function cancelledByStudentEmail(f: BookingFacts): Email {
  const s = first(f.student.name);
  return {
    to: f.mentor.email,
    toName: f.mentor.name,
    subject: `${s} cancelled their session`,
    text: `Hi ${first(f.mentor.name)},

${s} has cancelled their session with you on ${when(f.startsAt, f.mentor.timeZone)}. The time is open again for other students.

${SIGN_OFF}`,
  };
}

/** To each of them, the day before or the morning of a confirmed session. */
export function reminderEmails(f: BookingFacts): Email[] {
  const join = `${f.appUrl}/session/${f.bookingId}`;
  return [
    {
      to: f.student.email,
      toName: f.student.name,
      subject: `Reminder: your session with ${f.mentor.name}`,
      text: `Hi ${first(f.student.name)},

A reminder that your session with ${f.mentor.name} is on ${when(f.startsAt, f.student.timeZone)}.

Join here. The call opens 10 minutes before the start:
${join}

${SIGN_OFF}`,
    },
    {
      to: f.mentor.email,
      toName: f.mentor.name,
      subject: `Reminder: your session with ${first(f.student.name)}`,
      text: `Hi ${first(f.mentor.name)},

A reminder that your session with ${first(f.student.name)} is on ${when(f.startsAt, f.mentor.timeZone)}.

What they want to talk about: ${f.topic}

Join here. The call opens 10 minutes before the start:
${join}

${SIGN_OFF}`,
    },
  ];
}
