import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  Check,
  Compass,
  Cpu,
  Palette,
  Rocket,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import Guide from '@/components/brand/Guide';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import type { Consultant, Sector } from '@/lib/types';
import { SECTORS } from '@/lib/types';

/* ──────────────────────────────────────────────────────────────────────────
   Shared
   ────────────────────────────────────────────────────────────────────────── */

function SectionHeader({
  eyebrow,
  title,
  intro,
  light = false,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  light?: boolean;
}) {
  return (
    <div className="max-w-2xl">
      <p
        className={`flex items-center gap-2.5 text-micro font-semibold uppercase ${
          light ? 'text-sky' : 'text-navy'
        }`}
      >
        <span className="h-[3px] w-6 rounded-full bg-sky" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2
        className={`mt-4 text-[30px] font-bold leading-[1.1] tracking-[-0.03em] md:text-[40px] ${
          light ? 'text-white' : 'text-ink'
        }`}
      >
        {title}
      </h2>
      {intro && (
        <p className={`mt-3 text-base leading-relaxed ${light ? 'text-white/70' : 'text-muted'}`}>{intro}</p>
      )}
    </div>
  );
}

/** A tinted stage that frames a small slice of real product UI. */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-[220px] items-center justify-center overflow-hidden rounded-xl border border-sky-muted bg-sky-soft p-5">
      <div
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(29,63,90,0.09)_1px,transparent_1px)] [background-size:18px_18px]"
        aria-hidden="true"
      />
      <div className="relative w-full transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.02]">
        {children}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   How it works
   ────────────────────────────────────────────────────────────────────────── */

function ChatVignette() {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden="true">
      <div className="flex items-end gap-2">
        <Guide size={40} track={false} />
        <p className="rounded-2xl rounded-bl-md border border-sky-muted bg-white px-3.5 py-2.5 text-[13px] leading-snug text-ink shadow-card">
          What do people come to you for?
        </p>
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        <span className="flex items-center gap-1 rounded-full bg-navy px-3 py-1.5 text-[12px] text-white">
          <Check size={12} strokeWidth={2.5} />
          Figuring out why things break
        </span>
        <span className="rounded-full border border-sky-muted bg-white px-3 py-1.5 text-[12px] text-ink">
          Creative ideas
        </span>
      </div>
    </div>
  );
}

function PathVignette() {
  return (
    <div className="rounded-xl border border-sky-muted bg-white p-4 shadow-card" aria-hidden="true">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">Your strongest match</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">Data Science &amp; Analytics</p>
        <Badge variant="sector">Technology</Badge>
      </div>
      <ol className="mt-3 space-y-2">
        {[
          ['Year 1', 'Build the foundations', true],
          ['Year 2', 'Ship real analysis', false],
          ['Year 3', 'Own a domain', false],
        ].map(([year, label, current]) => (
          <li key={year as string} className="flex items-center gap-2.5 text-[12px]">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                current ? 'bg-navy text-white' : 'bg-sky-soft text-navy'
              }`}
            >
              {(year as string).slice(-1)}
            </span>
            <span className={current ? 'font-medium text-ink' : 'text-muted'}>{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BookVignette({ consultant: c }: { consultant: Consultant }) {
  return (
    <div className="rounded-xl border border-sky-muted bg-white p-4 shadow-card" aria-hidden="true">
      <div className="flex items-center gap-2.5">
        <Avatar initials={c.initials} size="xs" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{c.name}</p>
          <p className="truncate text-[11.5px] text-muted">{c.role}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {['10:00', '11:00', '15:00'].map((t, i) => (
          <span
            key={t}
            className={`rounded-md border py-1.5 text-center text-[12px] font-medium ${
              i === 1 ? 'border-navy bg-navy text-white' : 'border-line text-ink'
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      <span className="mt-2.5 block rounded-md bg-navy py-2 text-center text-[12px] font-medium text-white">
        Book Wed, 11:00
      </span>
    </div>
  );
}

export function HowItWorks({ consultant }: { consultant: Consultant }) {
  const steps = [
    {
      title: 'Speak with Pathy',
      body: 'Six quick questions in a friendly conversation. It reads who you actually are, not what sounds impressive on paper.',
      visual: <ChatVignette />,
    },
    {
      title: 'See the path that fits',
      body: 'A career direction matched to your answers, with a three-year roadmap built for the African job market.',
      visual: <PathVignette />,
    },
    {
      title: 'Talk to someone doing it',
      body: 'Every result ends with vetted professionals in that field. Book a free video call and ask them everything.',
      visual: <BookVignette consultant={consultant} />,
    },
  ];

  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-line px-5 py-24 md:px-10">
      <SectionHeader
        eyebrow="How it works"
        title="From not sure to talking to someone, in three steps"
      />

      <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
        {/* The path linking the three steps */}
        <span
          className="absolute left-[16%] right-[16%] top-[258px] hidden h-0 border-t-2 border-dashed border-sky md:block"
          aria-hidden="true"
        />
        {steps.map((s, i) => (
          <li key={s.title} className="group relative flex flex-col">
            <Stage>{s.visual}</Stage>
            <span className="relative z-10 mx-auto mt-5 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-navy text-[13px] font-semibold text-white shadow-card md:mx-auto">
              {i + 1}
            </span>
            <h3 className="mt-4 text-center text-lg font-semibold tracking-[-0.01em] text-ink">{s.title}</h3>
            <p className="mx-auto mt-2 max-w-[320px] text-center text-sm leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Sectors
   ────────────────────────────────────────────────────────────────────────── */

const SECTOR_DETAILS: Record<Sector, { icon: LucideIcon; blurb: string; roles: string[] }> = {
  Entrepreneurship: {
    icon: Rocket,
    blurb: 'Founders, marketers and operators building companies across the continent.',
    roles: ['Founder', 'Growth marketer', 'Operations lead'],
  },
  Technology: {
    icon: Cpu,
    blurb: 'Engineering, product and data at startups and global technology companies.',
    roles: ['Software engineer', 'Product manager', 'Data analyst'],
  },
  Finance: {
    icon: BarChart3,
    blurb: 'Investment banking, Big 4 and audit, including what the textbooks leave out.',
    roles: ['Investment analyst', 'Auditor', 'Risk analyst'],
  },
  Creative: {
    icon: Palette,
    blurb: 'Design, film and content, plus the business side nobody teaches you.',
    roles: ['Product designer', 'Filmmaker', 'Content strategist'],
  },
};

export function Sectors({ consultants }: { consultants: Consultant[] }) {
  return (
    <section id="sectors" className="scroll-mt-20 border-t border-line px-5 py-24 md:px-10">
      <SectionHeader
        eyebrow="Sectors"
        title="Four sectors. Real professionals."
        intro="Every mentor is reviewed by the Pathora team before students can book them."
      />

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {SECTORS.map((name) => {
          const { icon: Icon, blurb, roles } = SECTOR_DETAILS[name];
          const people = consultants.filter((c) => c.sector === name);
          return (
            <Link
              key={name}
              href={`/explore?sector=${encodeURIComponent(name)}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-sky-muted bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-navy hover:shadow-raised"
            >
              {/* A soft sky shape in the corner, echoing the Guide */}
              <span
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-[58%_42%_46%_54%/52%_48%_52%_48%] bg-sky-soft transition-transform duration-500 group-hover:scale-125"
                aria-hidden="true"
              />
              <div className="relative flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <ArrowUpRight
                  size={18}
                  className="text-faint transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-navy"
                />
              </div>
              <h3 className="relative mt-6 text-lg font-semibold tracking-[-0.01em] text-ink">{name}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-muted">{blurb}</p>
              <div className="relative mt-5 flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <span key={r} className="rounded-full bg-sky-soft px-2.5 py-1 text-[12px] text-navy">
                    {r}
                  </span>
                ))}
              </div>
              <div className="relative mt-auto pt-6">
              <div className="flex items-center justify-between border-t border-line pt-5">
                <div className="flex -space-x-1.5">
                  {people.slice(0, 3).map((c) =>
                    c.photo ? (
                      <Image
                        key={c.id}
                        src={c.photo}
                        alt=""
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full object-cover object-[50%_22%] ring-[3px] ring-white"
                      />
                    ) : (
                      <span
                        key={c.id}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-soft text-[10.5px] font-semibold text-navy ring-[3px] ring-white"
                      >
                        {c.initials}
                      </span>
                    ),
                  )}
                </div>
                <span className="text-[13px] font-medium text-navy">
                  {people.length} mentor{people.length === 1 ? '' : 's'}
                </span>
              </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   For mentors
   ────────────────────────────────────────────────────────────────────────── */

const MENTOR_POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: CalendarClock,
    title: 'On your schedule',
    body: 'Set the weekly hours that suit you. Students book 45-minute video sessions inside them.',
  },
  {
    icon: Compass,
    title: 'Matched to you',
    body: 'Students reach you after Pathy has pointed them at your field, so every session starts with context.',
  },
  {
    icon: ShieldCheck,
    title: 'Vetted, both ways',
    body: 'Every mentor is reviewed before students can book them, and every student has agreed to a code of conduct.',
  },
];

export function ForMentors() {
  return (
    <section id="for-mentors" className="scroll-mt-20 border-t border-line px-5 py-24 md:px-10">
      <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-5">
          <SectionHeader
            eyebrow="For professionals"
            title="Give one free session a month. Change a student's trajectory."
            intro="You already know the route students are trying to find. Pathora brings you the ones heading your way."
          />
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/become-a-mentor"
              className="group flex items-center gap-2 rounded bg-navy px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
            >
              Become a mentor
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/signin?callbackUrl=%2Fmentor"
              className="px-3 py-3.5 text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              Already a mentor? Sign in
            </Link>
          </div>
        </div>

        <ul className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
          {MENTOR_POINTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex flex-col gap-3 rounded-2xl border border-sky-muted bg-white p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-white">
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <p className="text-[15px] font-semibold text-ink">{title}</p>
              <p className="text-[13.5px] leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   About
   ────────────────────────────────────────────────────────────────────────── */

const ABOUT_FACTS: { title: string; body: string }[] = [
  {
    title: 'Advice that ends with a person',
    body: 'Most career tools stop at a list of jobs. Every Pathora roadmap ends with three vetted professionals working in that field.',
  },
  {
    title: 'Built for the African job market',
    body: 'Pathy points to real routes in, real employers and real programmes, not advice that only works in the US or Europe.',
  },
  {
    title: 'Free, private, and part of a study',
    body: 'Sessions are free and never recorded. Pathora is a research study: your answers stay private and the research uses a code, not your name.',
  },
];

export function About() {
  return (
    <section id="about" className="scroll-mt-20 border-t border-line bg-gradient-to-b from-sky-soft/70 to-white px-5 py-24 md:px-10">
      <SectionHeader
        eyebrow="About Pathora"
        title="Find your direction, then talk to someone already in it."
      />
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {ABOUT_FACTS.map((f, i) => (
          <div key={f.title} className="flex flex-col gap-3 rounded-2xl border border-sky-muted bg-white p-7">
            <span className="text-micro font-semibold uppercase text-navy">0{i + 1}</span>
            <p className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{f.title}</p>
            <p className="text-[14px] leading-relaxed text-muted">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Closing call to action
   ────────────────────────────────────────────────────────────────────────── */

export function ClosingCta() {
  return (
    <section className="px-5 pb-24 md:px-10">
      <div className="on-dark relative overflow-hidden rounded-[28px] bg-navy p-10 md:p-16">
        <svg
          viewBox="0 0 800 300"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path
            d="M-20 330 C 180 300, 330 230, 470 170 S 690 60, 830 20"
            fill="none"
            stroke="#96CAD3"
            strokeOpacity={0.22}
            strokeWidth={46}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="relative flex flex-col items-start gap-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="max-w-2xl text-[30px] font-bold leading-[1.1] tracking-[-0.03em] text-white md:text-[42px]">
              Stop guessing. Start asking people who already made it.
            </h2>
            <p className="mt-4 flex items-center gap-2 text-[14px] text-white/65">
              <ShieldCheck size={15} strokeWidth={1.75} className="text-sky" />
              Every mentor is vetted by the Pathora team. Sessions are free.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="group flex items-center gap-2 rounded bg-white px-6 py-3.5 text-sm font-medium text-navy transition-colors hover:bg-sky-soft"
              >
                Create your free account
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/become-a-mentor"
                className="rounded border border-white/25 px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Become a mentor
              </Link>
            </div>
          </div>

          <div className="relative hidden shrink-0 flex-col items-center md:flex" aria-hidden="true">
            <p className="mb-4 rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-[13.5px] font-medium text-navy shadow-raised">
              Ready when you are.
            </p>
            {/* A soft sky glow so the navy Guide stands out on the navy band */}
            <div className="relative">
              <span className="absolute inset-[-18%] rounded-full bg-sky/35 blur-2xl" />
              <Guide size={112} className="relative" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
