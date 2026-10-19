'use client';

import { useEffect, useRef } from 'react';

/**
 * Pathy, the Pathora guide: the character students speak with in Career Discovery.
 *
 * A navy blob that slowly changes shape, with white eyes that follow the
 * pointer and blink. Mood changes how it looks:
 *   idle      floats gently, eyes follow the pointer
 *   thinking  quicker wobble, eyes glance up and away
 *   talking   small bounce, used while it "types" a message
 *   happy     eyes close into smiling arcs
 *
 * Purely decorative: it is hidden from screen readers, and all movement stops
 * under prefers-reduced-motion except the pointer tracking the user drives.
 */

export type GuideMood = 'idle' | 'thinking' | 'talking' | 'happy';

export default function Guide({
  size = 96,
  mood = 'idle',
  track = true,
  className = '',
}: {
  size?: number;
  mood?: GuideMood;
  /** Eyes follow the pointer. */
  track?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Eye tracking writes CSS variables directly, so moving the mouse never
  // re-renders React.
  useEffect(() => {
    const el = ref.current;
    if (!el || !track || mood === 'thinking' || mood === 'happy') return;

    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect();
        const dx = e.clientX - (box.left + box.width / 2);
        const dy = e.clientY - (box.top + box.height / 2);
        const reach = Math.max(window.innerWidth, window.innerHeight) / 2.5;
        el.style.setProperty('--px', String(Math.max(-1, Math.min(1, dx / reach))));
        el.style.setProperty('--py', String(Math.max(-1, Math.min(1, dy / reach))));
      });
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [track, mood]);

  const eyeW = size * 0.15;
  const eyeH = size * 0.2;
  const pupil = size * 0.085;
  // Thinking: glance up and to the side.
  const gaze = mood === 'thinking' ? { '--px': '0.65', '--py': '-0.85' } : {};

  const motion =
    mood === 'talking'
      ? 'animate-guide-bounce'
      : mood === 'thinking'
        ? 'animate-guide-float [animation-duration:2.2s]'
        : 'animate-guide-float';

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`group relative shrink-0 select-none motion-reduce:animate-none ${motion} ${className}`}
      style={{ width: size, height: size, ...gaze } as React.CSSProperties}
    >
      {/* Soft shadow on the ground */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-navy/20 blur-[6px]"
        style={{ bottom: -size * 0.06, width: size * 0.62, height: size * 0.1 }}
      />

      {/* Body */}
      <div
        className={`absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-[1.05] group-active:scale-x-[1.08] group-active:scale-y-[0.92] motion-reduce:animate-none ${
          mood === 'thinking' ? 'animate-blob-fast' : 'animate-blob'
        }`}
        style={{
          background:
            'radial-gradient(circle at 32% 28%, #3A6688 0%, #1D3F5A 48%, #152E42 100%)',
          boxShadow: `inset ${-size * 0.06}px ${-size * 0.08}px ${size * 0.16}px rgba(10, 25, 38, 0.45)`,
        }}
      >
        {/* Sky sheen, echoing the path in the logo */}
        <div
          className="absolute rounded-full bg-sky/40 blur-[2px]"
          style={{ left: '20%', top: '16%', width: size * 0.2, height: size * 0.1, rotate: '-28deg' }}
        />
      </div>

      {/* Eyes */}
      <div
        className="absolute left-1/2 flex -translate-x-1/2"
        style={{ top: '30%', gap: size * 0.13 }}
      >
        {[0, 1].map((i) =>
          mood === 'happy' ? (
            <span
              key={i}
              className="block rounded-t-full border-white"
              style={{
                width: eyeW,
                height: eyeH * 0.5,
                marginTop: eyeH * 0.3,
                borderTopWidth: size * 0.04,
                borderLeftWidth: size * 0.04,
                borderRightWidth: size * 0.04,
              }}
            />
          ) : (
            <span
              key={i}
              className="relative block overflow-hidden rounded-full bg-white animate-blink motion-reduce:animate-none"
              style={{ width: eyeW, height: eyeH, animationDelay: i ? '40ms' : '0ms' }}
            >
              <span
                className="absolute left-1/2 top-1/2 block rounded-full bg-navy-deep transition-transform duration-200 ease-out"
                style={{
                  width: pupil,
                  height: pupil,
                  transform: `translate(calc(-50% + var(--px, 0) * ${eyeW * 0.26}px), calc(-50% + var(--py, 0) * ${eyeH * 0.24}px))`,
                }}
              >
                {/* Catchlight */}
                <span
                  className="absolute rounded-full bg-white/90"
                  style={{ width: pupil * 0.32, height: pupil * 0.32, left: '18%', top: '16%' }}
                />
              </span>
            </span>
          ),
        )}
      </div>
    </div>
  );
}
