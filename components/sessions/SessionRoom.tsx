'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, PhoneOff, ShieldCheck, Video } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import type { SessionRoomInfo } from '@/lib/db/queries/video';

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function until(target: number, now: number): string {
  const s = Math.max(0, Math.round((target - now) / 1000));
  const d = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} day${d === 1 ? '' : 's'} ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return m > 0 ? `${m} min` : 'less than a minute';
}

/**
 * The session room: a waiting card until the call opens (10 minutes before
 * the start), then Daily's call screen in a frame, joined with this person's
 * own meeting token. Times are shown in the viewer's own timezone.
 */
export default function SessionRoom({ info, backHref }: { info: SessionRoomInfo; backHref: string }) {
  const [now, setNow] = useState<number | null>(null);
  const [call, setCall] = useState<{ src: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const opens = Date.parse(info.opensAt);
  const closes = Date.parse(info.closesAt);
  const leaveUrl = `/api/sessions/${info.bookingId}/leave`;

  // Leaving the page (closing the tab, navigating away) records the call's timing too.
  useEffect(() => {
    if (!call) return;
    const onHide = () => navigator.sendBeacon(leaveUrl);
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [call, leaveUrl]);

  const join = useCallback(async () => {
    setJoining(true);
    setError(null);
    const res = await fetch(`/api/sessions/${info.bookingId}/join`, { method: 'POST' }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setJoining(false);
    if (!res?.ok || !data?.roomUrl) {
      setError(data?.error ?? 'Could not open the call. Please try again.');
      return;
    }
    setCall({ src: `${data.roomUrl}?t=${encodeURIComponent(data.token)}` });
  }, [info.bookingId]);

  const leave = async () => {
    await fetch(leaveUrl, { method: 'POST' }).catch(() => null);
    window.location.href = backHref;
  };

  const header = (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/10 px-5 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {!call && (
          <Link href={backHref} aria-label="Back" className="rounded p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-white">Session with {info.otherName}</p>
          <p className="truncate text-[12.5px] text-white/55">{info.topic} · 45 min</p>
        </div>
      </div>
      {call && (
        <button
          onClick={leave}
          className="inline-flex shrink-0 items-center gap-2 rounded bg-white px-4 py-2 text-[13.5px] font-medium text-ink transition-colors hover:bg-white/90"
        >
          <PhoneOff size={15} />
          Leave session
        </button>
      )}
    </header>
  );

  if (call) {
    return (
      <div className="flex h-[100dvh] flex-col bg-[#111]">
        {header}
        <iframe
          src={call.src}
          title={`Video call with ${info.otherName}`}
          allow="camera; microphone; fullscreen; display-capture; autoplay; speaker-selection"
          className="w-full flex-1 border-0"
        />
      </div>
    );
  }

  let body: React.ReactNode;
  if (info.status !== 'confirmed') {
    const reason =
      info.status === 'pending'
        ? `${info.otherName} has not confirmed this session yet. The call opens once it is confirmed.`
        : info.status === 'cancelled'
          ? 'This session was cancelled.'
          : 'This session has already taken place.';
    body = <p className="text-[15px] leading-relaxed text-white/70">{reason}</p>;
  } else if (now === null) {
    body = <Loader2 size={22} className="animate-spin text-white/50" />;
  } else if (now > closes) {
    body = <p className="text-[15px] leading-relaxed text-white/70">This session has finished.</p>;
  } else {
    const open = now >= opens;
    body = (
      <>
        <p className="text-[15px] text-white/70">
          {timeFormat.format(new Date(info.startsAt))} · 45 minutes
        </p>
        <p className="mt-1 text-[13.5px] text-white/50">
          {open ? 'The call is open.' : `The call opens 10 minutes before, in ${until(opens, now)}.`}
        </p>
        <button
          onClick={join}
          disabled={!open || joining}
          className="mt-7 inline-flex items-center gap-2 rounded bg-white px-6 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {joining ? <Loader2 size={17} className="animate-spin" /> : <Video size={17} />}
          {open ? 'Join the call' : 'Not open yet'}
        </button>
        {error && (
          <p role="alert" className="mt-4 text-[13.5px] text-white">
            {error}
          </p>
        )}
        <p className="mt-8 flex max-w-sm items-start gap-2 text-left text-[12.5px] leading-relaxed text-white/50">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" />
          Private room: only you and {info.otherName} can join. Sessions are never recorded. Your browser will ask
          to use your camera and microphone.
        </p>
      </>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#111]">
      {header}
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center">
        <Avatar initials={info.otherInitials} photo={info.otherPhoto} size="xl" tone="dark" />
        <h1 className="mt-6 text-[22px] font-semibold tracking-[-0.01em] text-white">{info.otherName}</h1>
        <div className="mt-2 flex flex-col items-center">{body}</div>
      </main>
    </div>
  );
}
