'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  MonitorUp,
  PanelRightClose,
  PanelRightOpen,
  PhoneOff,
  ShieldCheck,
  Video,
  VideoOff,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { consultants, getConsultant } from '@/lib/data';

function formatTimer(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export default function SessionRoomPage({ params }: { params: { id: string } }) {
  const consultant = getConsultant(params.id) ?? consultants[0];
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const controlButton =
    'flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-[11px] font-medium transition-colors';

  return (
    <div className="flex h-screen flex-col bg-[#0A1428] text-white">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-white/10 bg-navy px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/dashboard" className="font-fraunces text-xl font-bold">
            Pathora<span className="text-amber">.</span>
          </Link>
          <p className="hidden truncate text-sm text-white/60 md:block">
            Session with {consultant.name} · 45 mins
          </p>
        </div>
        <p className="font-mono text-sm font-semibold tabular-nums text-amber" aria-label="Session timer">
          {formatTimer(seconds)}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-[10px] p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={sidebarOpen ? 'Hide session info' : 'Show session info'}
          >
            {sidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
          <Link
            href="/dashboard"
            className="rounded-[10px] bg-red-600 px-4 py-2 text-sm font-semibold transition-all duration-[180ms] hover:scale-[1.02] hover:bg-red-700 active:scale-[0.98]"
          >
            End Session
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Video area ────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center p-4 md:p-8">
            <div className="relative flex aspect-video w-full max-w-4xl flex-col items-center justify-center rounded-2xl bg-navy">
              <Avatar initials={consultant.initials} color={consultant.avatarColor} size="xl" />
              <p className="mt-4 font-fraunces text-xl font-bold">{consultant.name}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-white/50">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-amber" />
                Video connecting...
              </p>
              {sharing && (
                <p className="absolute left-4 top-4 rounded-full bg-forest px-3 py-1 text-xs font-semibold">
                  You are sharing your screen
                </p>
              )}

              {/* Self-view pip */}
              <div className="absolute bottom-4 right-4 flex h-24 w-36 flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0A1428] md:h-28 md:w-44">
                {cameraOff ? (
                  <VideoOff size={20} className="text-white/40" />
                ) : (
                  <Avatar initials="EO" color="#1C3461" size="sm" />
                )}
                <p className="mt-2 text-[11px] text-white/50">You {muted ? '· muted' : ''}</p>
              </div>
            </div>
          </div>

          {/* ── Controls bar ────────────────────────────────── */}
          <div className="flex h-[76px] shrink-0 items-center justify-center gap-2 border-t border-white/10 bg-navy md:gap-4">
            <button
              onClick={() => setMuted((v) => !v)}
              aria-pressed={muted}
              className={`${controlButton} ${muted ? 'bg-white/15 text-red-400' : 'text-white/80 hover:bg-white/10'}`}
            >
              {muted ? <MicOff size={20} /> : <Mic size={20} />}
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              onClick={() => setCameraOff((v) => !v)}
              aria-pressed={cameraOff}
              className={`${controlButton} ${cameraOff ? 'bg-white/15 text-red-400' : 'text-white/80 hover:bg-white/10'}`}
            >
              {cameraOff ? <VideoOff size={20} /> : <Video size={20} />}
              Camera
            </button>
            <button
              onClick={() => setSharing((v) => !v)}
              aria-pressed={sharing}
              className={`${controlButton} ${sharing ? 'bg-forest text-white' : 'text-white/80 hover:bg-white/10'}`}
            >
              <MonitorUp size={20} />
              Share
            </button>
            <Link
              href="/dashboard"
              className="ml-2 flex flex-col items-center gap-1 rounded-xl bg-red-600 px-6 py-2 text-[11px] font-medium transition-all duration-[180ms] hover:scale-[1.02] hover:bg-red-700 active:scale-[0.98]"
            >
              <PhoneOff size={20} />
              End
            </Link>
          </div>
        </div>

        {/* ── Session info sidebar ──────────────────────────── */}
        {sidebarOpen && (
          <aside className="hidden w-[280px] shrink-0 flex-col border-l border-black/10 bg-white text-text-main md:flex">
            <div className="flex items-center gap-3 border-b p-5">
              <Avatar initials={consultant.initials} color={consultant.avatarColor} size="md" />
              <div className="min-w-0">
                <p className="truncate font-fraunces text-[15px] font-bold text-navy">
                  {consultant.name}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {consultant.role} · {consultant.company}
                </p>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <label
                htmlFor="session-notes"
                className="text-xs font-semibold uppercase tracking-[0.8px] text-text-muted"
              >
                Session notes
              </label>
              <textarea
                id="session-notes"
                placeholder="Add session notes..."
                className="mt-3 flex-1 resize-none rounded-[10px] border bg-cream p-3 text-sm leading-relaxed placeholder:text-text-light focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
              />
              <p className="mt-4 flex items-center gap-2 text-xs font-medium text-forest">
                <ShieldCheck size={14} />
                This session is private and secure
              </p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
