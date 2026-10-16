'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import Guide from '@/components/brand/Guide';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import type { Consultant } from '@/lib/types';

/**
 * The hero illustration: Pathora's promise drawn as a path.
 *
 * A sky ribbon (the path from the logo) sweeps upward from the Guide, through
 * a direction, to a real person at the arrow's end. Conversation, then
 * direction, then a human. That is the product in one picture.
 *
 * Layout: everything is placed on a fixed 600 x 540 stage in pixels, and the
 * whole stage is scaled to the panel's width. Cards, path and Guide therefore
 * keep their positions relative to each other at every width, instead of
 * colliding as the panel narrows.
 */

const STAGE_W = 600;
const STAGE_H = 540;

const PATH = 'M60 500 C 150 470, 190 400, 260 350 S 400 250, 450 170 S 520 92, 548 70';

function Step({ n, label }: { n: number; label: string }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-navy/70">
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-navy text-[10px] text-white">
        {n}
      </span>
      {label}
    </p>
  );
}

function ChatCard() {
  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-[240px] rounded-2xl rounded-bl-md border border-sky-muted bg-white px-4 py-3 shadow-card">
        <p className="text-[11px] font-semibold text-navy">Pathora Guide</p>
        <p className="mt-0.5 text-[13.5px] leading-snug text-ink">What do you love figuring out?</p>
      </div>
      <div className="ml-10 max-w-[230px] self-start rounded-2xl rounded-br-md bg-navy px-4 py-3 text-[13.5px] leading-snug text-white shadow-card">
        Why people love some apps and ignore others.
      </div>
    </div>
  );
}

function DirectionCard() {
  return (
    <div className="w-full rounded-2xl border border-sky-muted bg-white p-4 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-raised">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
            Your direction
          </p>
          <p className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Product management
          </p>
        </div>
        <Badge variant="sector">Technology</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-1.5">
        {['Weeks 1–4', 'Months 2–3', 'Months 4–6'].map((label, i) => (
          <div key={label}>
            <span className={`block h-1 rounded-full ${i === 0 ? 'bg-navy' : 'bg-sky-muted'}`} />
            <span className="mt-1.5 block text-[10.5px] text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsultantCard({ consultant: c }: { consultant: Consultant }) {
  return (
    <div className="w-full rounded-2xl border border-sky-muted bg-white p-4 shadow-raised transition duration-300 hover:-translate-y-1">
      <div className="flex items-center gap-3">
        <Avatar initials={c.initials} size="sm" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold tracking-[-0.01em] text-ink">
            <span className="truncate">{c.name}</span>
            <ShieldCheck size={13} strokeWidth={1.5} className="shrink-0 text-navy" aria-label="Vetted by Pathora" />
          </p>
          <p className="truncate text-[12.5px] text-muted">
            {c.role} · {c.company}
          </p>
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-available">
          <span className="h-1.5 w-1.5 rounded-full bg-available" aria-hidden="true" />
          Available this week
        </span>
        <Link
          href="/explore"
          className="whitespace-nowrap rounded-md bg-navy px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-navy-deep"
        >
          Book a session
        </Link>
      </div>
    </div>
  );
}

/** A milestone dot on the path. */
function Node({ x, y, delay }: { x: number; y: number; delay: string }) {
  return (
    <span
      className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 animate-pop-in rounded-full border-[3px] border-navy bg-white motion-reduce:animate-none"
      style={{ left: x, top: y, animationDelay: delay }}
      aria-hidden="true"
    />
  );
}

export default function HeroJourney({ consultant }: { consultant: Consultant }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1.12, entry.contentRect.width / STAGE_W));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-[28px] border border-sky-muted bg-gradient-to-br from-sky-soft via-white to-sky-soft"
      role="img"
      aria-label="How Pathora works: talk to the Pathora Guide, get a career direction, then book a session with a professional already working in it."
    >
      {/* Dotted grid, fading out towards the edges */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(rgba(29,63,90,0.10)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_80%)]"
        aria-hidden="true"
      />

      {/* ── Desktop and tablet: everything placed along the path ───────── */}
      <div ref={frame} className="relative hidden sm:block" style={{ height: STAGE_H * scale }}>
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}
        >
          <svg viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
            <path
              d={PATH}
              pathLength={1}
              fill="none"
              stroke="#96CAD3"
              strokeWidth={30}
              strokeLinecap="round"
              strokeDasharray="1"
              className="animate-draw motion-reduce:animate-none"
              opacity={0.75}
            />
            <path
              d={PATH}
              fill="none"
              stroke="#ffffff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="2 12"
              className="animate-fade-in motion-reduce:animate-none"
              style={{ animationDelay: '1.6s' }}
            />
          </svg>

          <Node x={260} y={350} delay="0.9s" />
          <Node x={450} y={170} delay="1.3s" />

          {/* Destination: the arrow from the logo */}
          <span
            className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 animate-pop-in items-center justify-center rounded-full bg-navy text-white shadow-raised motion-reduce:animate-none"
            style={{ left: 548, top: 70, animationDelay: '1.7s' }}
            aria-hidden="true"
          >
            <ArrowUpRight size={20} strokeWidth={2.25} />
          </span>

          {/* 1. The Guide, at the start of the path */}
          <div
            className="absolute animate-pop-in motion-reduce:animate-none"
            style={{ left: 16, bottom: 20, animationDelay: '0.1s' }}
          >
            <Guide size={92} />
          </div>
          <div
            className="absolute animate-pop-in motion-reduce:animate-none"
            style={{ left: 30, top: 158, width: 280, animationDelay: '0.45s' }}
          >
            <div className="animate-card-float motion-reduce:animate-none">
              <Step n={1} label="Talk it through" />
              <ChatCard />
            </div>
          </div>

          {/* 2. A direction, below the middle of the path */}
          <div
            className="absolute animate-pop-in motion-reduce:animate-none"
            style={{ right: 28, bottom: 46, width: 262, animationDelay: '1s' }}
          >
            <div className="animate-card-float motion-reduce:animate-none [animation-delay:-2s]">
              <Step n={2} label="Get a direction" />
              <DirectionCard />
            </div>
          </div>

          {/* 3. A person, where the path arrives */}
          <div
            className="absolute animate-pop-in motion-reduce:animate-none"
            style={{ left: 158, top: 20, width: 282, animationDelay: '1.5s' }}
          >
            <div className="animate-card-float motion-reduce:animate-none [animation-delay:-4s]">
              <Step n={3} label="Meet someone doing it" />
              <ConsultantCard consultant={consultant} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Phones: the same journey, stacked along a vertical path ─────── */}
      <div className="relative flex flex-col gap-6 p-5 sm:hidden">
        <span
          className="absolute bottom-10 left-[38px] top-24 w-2.5 rounded-full bg-sky/70"
          aria-hidden="true"
        />
        <div className="relative flex items-end gap-3">
          <Guide size={64} />
          <div className="pb-2">
            <Step n={1} label="Talk it through" />
          </div>
        </div>
        <div className="relative pl-14 pr-1">
          <ChatCard />
        </div>
        <div className="relative pl-14">
          <Step n={2} label="Get a direction" />
          <DirectionCard />
        </div>
        <div className="relative pl-14">
          <Step n={3} label="Meet someone doing it" />
          <ConsultantCard consultant={consultant} />
        </div>
      </div>
    </div>
  );
}
