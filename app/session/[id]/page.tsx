'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  MonitorUp,
  PencilLine,
  PhoneOff,
  Plus,
  ShieldCheck,
  Video,
  VideoOff,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { consultants, currentStudent, getConsultant } from '@/lib/data';

function formatTimer(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Circular control button on the dark stage. */
function ControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${
        active
          ? 'border-white/40 bg-white/20 text-white'
          : 'border-white/[0.12] bg-white/[0.06] text-white hover:bg-white/[0.12]'
      }`}
    >
      {children}
    </button>
  );
}

export default function SessionRoomPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const consultant = getConsultant(params.id) ?? consultants[0];
  const session = currentStudent.upcomingSession;

  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [notes, setNotes] = useState<string[]>(session.notes);
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (draft !== null) draftRef.current?.focus();
  }, [draft]);

  const commitDraft = () => {
    const text = draft?.trim();
    if (text) setNotes((prev) => [...prev, text]);
    setDraft(null);
  };

  return (
    <div className="on-dark flex h-screen flex-col overflow-hidden bg-ink text-white">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/[0.08] px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em]">
            Session with {consultant.name}
          </h1>
          <span className="hidden h-4 w-px bg-white/15 md:block" aria-hidden="true" />
          <p className="hidden truncate text-[13.5px] text-white/55 md:block">
            {session.topic} · 45 min
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-[7px]">
            <span className="h-1.5 w-1.5 rounded-full bg-available" aria-hidden="true" />
            <span className="text-[13.5px] tabular-nums" aria-label="Time elapsed">
              {formatTimer(seconds)}
            </span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded bg-white px-4 py-[9px] text-[13.5px] font-medium text-ink transition-colors hover:bg-white/90"
          >
            End session
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Stage ──────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
          <div className="relative flex min-h-0 flex-1 items-center justify-center rounded-lg border border-white/[0.06] bg-ink-soft">
            <div className="flex flex-col items-center gap-4">
              <Avatar initials={consultant.initials} size="xl" tone="dark" />
              <p className="px-4 text-center text-sm text-white/50">
                {sharing ? 'You are sharing your screen' : 'Camera is on — video preview'}
              </p>
            </div>

            <div className="absolute bottom-[18px] left-[18px] rounded-full bg-black/45 px-3 py-[7px] text-[13px]">
              {consultant.name}
            </div>

            <div className="absolute bottom-[18px] right-[18px] hidden h-[126px] w-[212px] items-center justify-center rounded-md border border-white/10 bg-[#242424] sm:flex">
              {cameraOff ? (
                <VideoOff size={20} strokeWidth={1.5} className="text-white/40" />
              ) : (
                <Avatar initials={currentStudent.initials} size="xs" tone="dark" />
              )}
              <span className="absolute bottom-2.5 left-3 text-[11.5px] text-white/60">
                You{muted ? ' · muted' : ''}
              </span>
            </div>
          </div>

          {/* ── Controls ─────────────────────────────────────── */}
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-3">
            <ControlButton
              label={muted ? 'Unmute microphone' : 'Mute microphone'}
              active={muted}
              onClick={() => setMuted((v) => !v)}
            >
              {muted ? <MicOff size={19} strokeWidth={1.5} /> : <Mic size={19} strokeWidth={1.5} />}
            </ControlButton>

            <ControlButton
              label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
              active={cameraOff}
              onClick={() => setCameraOff((v) => !v)}
            >
              {cameraOff ? (
                <VideoOff size={19} strokeWidth={1.5} />
              ) : (
                <Video size={19} strokeWidth={1.5} />
              )}
            </ControlButton>

            <ControlButton
              label={sharing ? 'Stop sharing screen' : 'Share screen'}
              active={sharing}
              onClick={() => setSharing((v) => !v)}
            >
              <MonitorUp size={19} strokeWidth={1.5} />
            </ControlButton>

            <ControlButton label="Add a note" onClick={() => setDraft('')}>
              <PencilLine size={19} strokeWidth={1.5} />
            </ControlButton>

            <button
              onClick={() => router.push('/dashboard')}
              className="flex h-12 items-center gap-2.5 rounded-full bg-white px-5 text-sm font-medium text-ink transition-colors hover:bg-white/90"
            >
              <PhoneOff size={17} strokeWidth={1.5} />
              Leave
            </button>
          </div>
        </div>

        {/* ── Session sidebar ────────────────────────────────── */}
        <aside className="hidden w-[340px] shrink-0 flex-col border-l border-white/[0.08] bg-[#161616] lg:flex">
          <div className="flex flex-col gap-4 border-b border-white/[0.08] p-[22px]">
            <div className="flex items-center gap-3">
              <Avatar initials={consultant.initials} size="md" tone="dark" />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[15px] font-semibold">{consultant.name}</span>
                <span className="truncate text-[12.5px] text-white/50">
                  {consultant.role} · {consultant.company}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-[7px]">
              <span className="rounded-full bg-white/[0.07] px-2.5 py-[5px] text-micro font-semibold uppercase text-white/75">
                {consultant.sector}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/[0.14] px-2.5 py-1 text-[12px] text-white/60">
                <ShieldCheck size={12} strokeWidth={1.5} />
                Vetted by Pathora
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3.5 p-[22px]">
            <h2 className="text-micro font-semibold uppercase tracking-[0.08em] text-white/40">
              Session notes
            </h2>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
              {notes.map((note, i) => (
                <p
                  key={i}
                  className="rounded-md bg-white/[0.04] p-3.5 text-[13.5px] leading-relaxed text-white/80"
                >
                  {note}
                </p>
              ))}
            </div>

            {draft === null ? (
              <button
                onClick={() => setDraft('')}
                className="flex items-center gap-2.5 rounded-md border border-white/[0.12] px-3.5 py-3 text-[13.5px] text-white/45 transition-colors hover:border-white/25 hover:text-white/70"
              >
                <Plus size={15} strokeWidth={1.5} />
                Add a note
              </button>
            ) : (
              <textarea
                ref={draftRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    commitDraft();
                  }
                  if (e.key === 'Escape') setDraft(null);
                }}
                rows={3}
                placeholder="Type a note, then press Enter"
                aria-label="New session note"
                className="resize-none rounded-md border border-white/[0.12] bg-transparent p-3.5 text-[13.5px] leading-relaxed text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
