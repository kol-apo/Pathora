import Link from 'next/link';
import { ShieldCheck, Star } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { consultants } from '@/lib/data';
import { SECTORS } from '@/lib/types';

const steps = [
  {
    number: '01',
    title: 'Answer six questions',
    description:
      'A short questionnaire that reads who you actually are, not what sounds impressive on paper.',
  },
  {
    number: '02',
    title: 'See paths that fit',
    description:
      'Career directions matched to your answers, each with a three-year roadmap for the African market.',
  },
  {
    number: '03',
    title: 'Talk to someone doing it',
    description:
      'Every result ends with vetted consultants in that field. Book a free video call and ask them everything.',
  },
];

const sectorBlurbs: Record<string, string> = {
  Entrepreneurship: 'Founders, marketers, and operators building companies across the continent.',
  Technology: 'Engineering, product, and data at startups and global technology companies.',
  Finance: 'Investment banking, Big 4, and audit — including what the textbooks leave out.',
  Creative: 'Design, film, and content, plus the business side nobody teaches you.',
};

const testimonials = [
  {
    quote:
      'I spent two years guessing what finance careers looked like. One session with a real analyst gave me more clarity than all of it.',
    name: 'Chiamaka U.',
    role: 'Economics, University of Nigeria',
    initials: 'CU',
  },
  {
    quote:
      'The questionnaire pointed me at product design, then showed me three designers to talk to. That bridge is the whole thing.',
    name: 'Yannick H.',
    role: 'Computer Science, ALU Rwanda',
    initials: 'YH',
  },
  {
    quote:
      'My consultant reviewed my Big 4 application line by line. I got the internship. Nothing else came close.',
    name: 'Salma B.',
    role: 'Accounting, University of Ghana',
    initials: 'SB',
  },
];

function HeroConsultantCard({ consultant }: { consultant: (typeof consultants)[number] }) {
  const c = consultant;
  return (
    <div className="flex w-full max-w-xs flex-col gap-3.5 rounded-lg border border-line bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <Avatar initials={c.initials} size="sm" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold tracking-[-0.01em] text-ink">
            <span className="truncate">{c.name}</span>
            <ShieldCheck size={13} strokeWidth={1.5} className="shrink-0 text-muted" />
          </p>
          <p className="truncate text-[12.5px] text-muted">
            {c.role} · {c.company}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-[7px]">
        <Badge variant="sector">{c.sector}</Badge>
        <Badge variant="tag">{c.focus[0]}</Badge>
      </div>
      <div className="flex items-center justify-between border-t border-line pt-3 text-[12.5px] text-muted">
        <span>{c.experience} years experience</span>
        <span className="flex items-center gap-1 text-ink">
          <Star size={12} className="fill-ink text-ink" aria-hidden="true" />
          {c.rating.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1440px]">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="grid items-center gap-12 px-5 py-16 md:px-10 lg:grid-cols-2 lg:py-24">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-micro font-semibold uppercase text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-available" aria-hidden="true" />
              Built for African students
            </span>
            <h1 className="mt-6 text-[40px] font-bold leading-[1.05] tracking-[-0.03em] text-ink md:text-[56px]">
              Your career path starts here, not after.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
              Vetted professionals across Africa, giving free sessions to students. Find your
              direction, then talk to someone already working in it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/explore"
                className="rounded bg-ink-soft px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-black"
              >
                Find a consultant
              </Link>
              <Link
                href="/discover"
                className="rounded border border-line px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-surface"
              >
                Discover your path
              </Link>
            </div>
            <p className="mt-9 text-[13px] leading-relaxed text-faint">
              500+ students already building their careers across Nigeria, Rwanda &amp; beyond.
            </p>
          </div>

          <div className="flex flex-col items-center gap-5 rounded-lg bg-surface p-8 md:p-12">
            <div className="self-start">
              <HeroConsultantCard consultant={consultants[0]} />
            </div>
            <div className="self-end">
              <HeroConsultantCard consultant={consultants[1]} />
            </div>
            <div className="mt-2 grid w-full grid-cols-3 gap-3">
              {[
                ['120+', 'Vetted consultants'],
                ['4', 'Sectors'],
                ['Free', 'to start'],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-lg border border-line bg-white p-4 text-center"
                >
                  <p className="text-lg font-semibold tracking-[-0.02em] text-ink">{value}</p>
                  <p className="mt-1 text-[11.5px] text-muted">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section id="how-it-works" className="border-t border-line px-5 py-20 md:px-10">
          <p className="text-micro font-semibold uppercase text-faint">How it works</p>
          <h2 className="mt-3 text-[30px] font-bold tracking-[-0.03em] text-ink md:text-[38px]">
            Three steps to career clarity
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map(({ number, title, description }) => (
              <div key={number} className="rounded-lg border border-line p-[22px]">
                <span className="text-[13px] font-semibold tabular-nums text-faint">{number}</span>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Sectors ──────────────────────────────────────────── */}
        <section className="border-t border-line px-5 py-20 md:px-10">
          <h2 className="text-[30px] font-bold tracking-[-0.03em] text-ink md:text-[38px]">
            Four sectors. Real professionals.
          </h2>
          <p className="mt-2.5 max-w-xl text-base leading-relaxed text-muted">
            Every consultant works in the industry today — no theorists, no career coaches who have
            never done the job.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {SECTORS.map((name) => {
              const count = consultants.filter((c) => c.sector === name).length;
              return (
                <Link
                  key={name}
                  href="/explore"
                  className="flex flex-col rounded-lg border border-line p-[22px] transition-colors hover:border-faint/40"
                >
                  <h3 className="text-lg font-semibold tracking-[-0.01em] text-ink">{name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                    {sectorBlurbs[name]}
                  </p>
                  <p className="mt-5 text-[13px] text-faint">
                    {count} consultant{count === 1 ? '' : 's'} →
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────────────────── */}
        <section id="about" className="border-t border-line px-5 py-20 md:px-10">
          <h2 className="text-[30px] font-bold tracking-[-0.03em] text-ink md:text-[38px]">
            Students are already ahead
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-lg border border-line p-[22px]">
                <div className="flex gap-1" aria-label="5 out of 5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className="fill-ink text-ink" aria-hidden="true" />
                  ))}
                </div>
                <blockquote className="mt-4 text-[15px] leading-relaxed text-ink">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <Avatar initials={t.initials} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-ink">{t.name}</p>
                    <p className="text-[12.5px] text-muted">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── Closing CTA ──────────────────────────────────────── */}
        <section className="px-5 pb-20 md:px-10">
          <div className="on-dark flex flex-col items-start gap-8 rounded-lg bg-ink p-10 md:p-16">
            <h2 className="max-w-2xl text-[30px] font-bold leading-[1.1] tracking-[-0.03em] text-white md:text-[42px]">
              Stop guessing. Start asking people who already made it.
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/explore"
                className="rounded bg-white px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-white/90"
              >
                Find a consultant
              </Link>
              <Link
                href="/discover"
                className="rounded border border-white/20 px-6 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                Discover your path
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
