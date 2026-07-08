import Link from 'next/link';
import {
  CalendarCheck,
  Compass,
  LineChart,
  Monitor,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { consultants } from '@/lib/data';

const heroAvatars = [
  { initials: 'AO', color: '#E8A020' },
  { initials: 'KM', color: '#1A6B4A' },
  { initials: 'ZN', color: '#1C3461' },
  { initials: 'DA', color: '#533AB7' },
];

const steps = [
  {
    number: '01',
    icon: Compass,
    title: 'Discover Your Path',
    description:
      'Answer six quick questions and our AI guide matches you to career paths that fit who you actually are.',
  },
  {
    number: '02',
    icon: Users,
    title: 'Find a Consultant',
    description:
      'Browse vetted professionals across Business, Finance, and Technology — people doing the job you want.',
  },
  {
    number: '03',
    icon: CalendarCheck,
    title: 'Book a Session',
    description:
      'Book a free 1:1 video session and get answers no career textbook will ever give you.',
  },
];

const sectors = [
  {
    icon: TrendingUp,
    name: 'Business',
    description: 'Marketing, strategy, entrepreneurship, and operations across African markets.',
    count: '40+ consultants',
  },
  {
    icon: LineChart,
    name: 'Finance',
    description: 'Investment banking, Big 4, audit, and everything the CFA books leave out.',
    count: '35+ consultants',
  },
  {
    icon: Monitor,
    name: 'Technology',
    description: 'Engineering, product, design, and data at startups and global tech companies.',
    count: '45+ consultants',
  },
];

const features = [
  {
    icon: Sparkles,
    title: 'AI Career Discovery',
    description: 'A guided questionnaire that turns who you are into where you should be heading.',
  },
  {
    icon: ShieldCheck,
    title: 'Vetted Consultants',
    description: 'Every professional is reviewed and approved by the Pathora team before they appear.',
  },
  {
    icon: Zap,
    title: 'Opportunities Feed',
    description: 'Fellowships, hackathons, internships, and ambassador programs — curated for Africa.',
  },
  {
    icon: CalendarCheck,
    title: 'Instant Booking',
    description: 'See availability, pick a slot, meet on video. No cold emails, no gatekeepers.',
  },
];

const testimonials = [
  {
    quote:
      'I spent two years guessing what finance careers looked like. One session with a real analyst gave me more clarity than all of it.',
    name: 'Chiamaka U.',
    role: 'Economics, University of Nigeria',
    initials: 'CU',
    color: '#1A6B4A',
  },
  {
    quote:
      'The discovery quiz told me product design fit me — then it showed me three designers to talk to. That bridge is everything.',
    name: 'Yannick H.',
    role: 'Computer Science, ALU Rwanda',
    initials: 'YH',
    color: '#1C3461',
  },
  {
    quote:
      'My consultant reviewed my Big 4 application line by line. I got the internship. This platform is unfair advantage.',
    name: 'Salma B.',
    role: 'Accounting, University of Ghana',
    initials: 'SB',
    color: '#B87A10',
  },
];

const chatMessages = [
  { from: 'ai', text: "Hi Emeka! Let's figure out your path. What excites you most about tech?" },
  { from: 'student', text: 'I love making things people actually use — apps, interfaces, that kind of thing.' },
  { from: 'ai', text: 'Interesting — do you prefer designing how it looks or building how it works?' },
  { from: 'student', text: 'Honestly? How it looks and feels. I sketch app ideas all the time.' },
];

function HeroConsultantCard({ consultant }: { consultant: (typeof consultants)[number] }) {
  return (
    <div className="w-full max-w-xs rounded-xl border border-white/10 bg-white p-5 shadow-card-hover">
      <div className="flex items-center gap-3">
        <Avatar initials={consultant.initials} color={consultant.avatarColor} size="md" />
        <div className="min-w-0">
          <p className="truncate font-fraunces text-[15px] font-bold text-navy">{consultant.name}</p>
          <p className="truncate text-xs text-text-muted">
            {consultant.role} · {consultant.company}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="sector">{consultant.sector}</Badge>
        {consultant.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded-full bg-warm-gray px-2.5 py-1 text-[11px] font-medium text-text-muted">
            {tag}
          </span>
        ))}
      </div>
      <Link
        href={`/consultants/${consultant.id}`}
        className="mt-4 block rounded-[10px] bg-amber py-2.5 text-center text-xs font-semibold text-white transition-all duration-[180ms] hover:scale-[1.02] hover:bg-amber-dark active:scale-[0.98]"
      >
        Book a Session
      </Link>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="grid lg:grid-cols-2">
          <div className="flex items-center bg-cream px-5 py-16 md:px-12 lg:py-24">
            <div className="mx-auto max-w-xl animate-fade-up lg:ml-auto lg:mr-16">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-light px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.8px] text-amber-dark">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                Built for African Students
              </span>
              <h1 className="mt-6 font-fraunces text-[42px] font-black leading-[1.05] tracking-[-2px] text-navy md:text-[60px]">
                Your career path starts <em className="italic text-amber">here</em>, not after.
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-text-muted">
                Connect with vetted industry professionals, discover your career path with AI
                guidance, and access real-world opportunities — all while still in school.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/explore"
                  className="inline-flex h-[52px] items-center rounded-[10px] bg-amber px-8 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(232,160,32,0.35)] transition-all duration-[180ms] hover:scale-[1.02] hover:bg-amber-dark active:scale-[0.98]"
                >
                  Find a Consultant
                </Link>
                <Link
                  href="/discover"
                  className="inline-flex h-[52px] items-center rounded-[10px] border border-black/10 px-8 text-[15px] font-semibold text-text-main transition-all duration-[180ms] hover:scale-[1.02] hover:border-amber hover:text-amber-dark active:scale-[0.98]"
                >
                  Discover Your Path →
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {heroAvatars.map((a) => (
                    <Avatar
                      key={a.initials}
                      initials={a.initials}
                      color={a.color}
                      size="sm"
                      className="ring-2 ring-cream"
                    />
                  ))}
                </div>
                <p className="max-w-[260px] text-[13px] leading-snug text-text-muted">
                  500+ students already building their careers across Nigeria, Rwanda &amp; beyond
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-navy px-5 py-16 md:px-12 lg:py-24">
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber/10"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-32 left-8 h-80 w-80 rounded-full bg-amber/[0.06]"
              aria-hidden="true"
            />
            <div className="relative mx-auto flex max-w-md flex-col items-center gap-6 lg:mr-auto lg:ml-16">
              <div className="animate-fade-up self-start">
                <HeroConsultantCard consultant={consultants[0]} />
              </div>
              <div className="animate-fade-up self-end [animation-delay:150ms]">
                <HeroConsultantCard consultant={consultants[1]} />
              </div>
              <div className="mt-4 grid w-full animate-fade-up grid-cols-3 gap-3 [animation-delay:300ms]">
                {[
                  ['120+', 'Vetted Consultants'],
                  ['3', 'Sectors'],
                  ['Free', 'to Start'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <p className="font-fraunces text-xl font-bold text-amber">{value}</p>
                    <p className="mt-1 text-[11px] font-medium text-white/60">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section id="how-it-works" className="mx-auto max-w-[1200px] px-5 py-20 md:px-12 md:py-24">
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-amber" />
            <p className="text-xs font-semibold uppercase tracking-[0.8px] text-amber-dark">
              How it works
            </p>
          </div>
          <h2 className="mt-4 font-fraunces text-[32px] font-extrabold tracking-[-1.5px] text-navy md:text-[44px]">
            Three steps to career clarity
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map(({ number, icon: Icon, title, description }) => (
              <div
                key={number}
                className="relative overflow-hidden rounded-xl border bg-white p-7 transition-all duration-200 hover:-translate-y-1 hover:border-amber/30 hover:shadow-card-hover"
              >
                <span className="pointer-events-none absolute -right-2 -top-5 font-fraunces text-[96px] font-black text-black/[0.04]">
                  {number}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-light text-amber-dark">
                  <Icon size={22} />
                </span>
                <h3 className="mt-5 font-fraunces text-xl font-bold text-navy">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Sectors ──────────────────────────────────────────── */}
        <section className="bg-navy py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-5 md:px-12">
            <h2 className="font-fraunces text-[32px] font-extrabold tracking-[-1.5px] text-white md:text-[44px]">
              Three sectors. Real professionals.
            </h2>
            <p className="mt-3 max-w-xl text-[15px] text-white/60">
              Every consultant works in the industry today — no theorists, no career coaches who
              have never done the job.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {sectors.map(({ icon: Icon, name, description, count }) => (
                <Link
                  key={name}
                  href="/explore"
                  className="group rounded-xl border border-white/10 bg-white/5 p-7 transition-all duration-200 hover:-translate-y-1 hover:border-amber"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber/15 text-amber">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 font-fraunces text-xl font-bold text-white">{name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.8px] text-amber">
                    {count} →
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features + AI chat mockup ────────────────────────── */}
        <section id="about" className="mx-auto max-w-[1200px] px-5 py-20 md:px-12 md:py-24">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-amber" />
                <p className="text-xs font-semibold uppercase tracking-[0.8px] text-amber-dark">
                  Why Pathora
                </p>
              </div>
              <h2 className="mt-4 font-fraunces text-[32px] font-extrabold tracking-[-1.5px] text-navy md:text-[40px]">
                Everything between confusion and your first offer
              </h2>
              <ul className="mt-10 space-y-7">
                {features.map(({ icon: Icon, title, description }) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-amber-light text-amber-dark">
                      <Icon size={20} />
                    </span>
                    <div>
                      <h3 className="font-fraunces text-lg font-bold text-navy">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-text-muted">{description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-card md:p-7">
              <div className="flex items-center gap-3 border-b pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber text-lg text-white">
                  ✦
                </span>
                <div>
                  <p className="font-fraunces text-[15px] font-bold text-navy">Career Guide</p>
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-forest">
                    <span className="h-1.5 w-1.5 rounded-full bg-forest" /> Online
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.from === 'student' ? 'justify-end' : ''}`}>
                    <p
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        m.from === 'ai'
                          ? 'rounded-tl-sm bg-warm-gray text-text-main'
                          : 'rounded-tr-sm bg-navy text-white'
                      }`}
                    >
                      {m.text}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-amber-light p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.8px] text-amber-dark">
                  Your career matches
                </p>
                <ul className="mt-3 space-y-2">
                  {['Product Design', 'Product Management', 'Frontend Engineering'].map((match) => (
                    <li key={match} className="flex items-center gap-2 text-sm font-medium text-text-main">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                      {match}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────────────────── */}
        <section className="bg-warm-gray py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-5 md:px-12">
            <h2 className="text-center font-fraunces text-[32px] font-extrabold tracking-[-1.5px] text-navy md:text-[40px]">
              Students are already ahead
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.name} className="rounded-xl border bg-white p-7">
                  <div className="flex gap-1" aria-label="5 star rating">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={15} className="fill-amber text-amber" />
                    ))}
                  </div>
                  <blockquote className="mt-4 font-fraunces text-[15px] italic leading-relaxed text-text-main">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <Avatar initials={t.initials} color={t.color} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-navy">{t.name}</p>
                      <p className="text-xs text-text-muted">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA banner ───────────────────────────────────────── */}
        <section className="bg-navy py-20 md:py-24">
          <div className="mx-auto max-w-[1200px] px-5 text-center md:px-12">
            <h2 className="mx-auto max-w-3xl font-fraunces text-[32px] font-extrabold tracking-[-1.5px] text-white md:text-[48px]">
              Stop guessing. Start asking people who{' '}
              <em className="italic text-amber">already made it</em>.
            </h2>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                href="/explore"
                className="inline-flex h-[52px] items-center rounded-[10px] bg-amber px-8 text-[15px] font-semibold text-white transition-all duration-[180ms] hover:scale-[1.02] hover:bg-amber-dark active:scale-[0.98]"
              >
                Find a Consultant
              </Link>
              <Link
                href="/discover"
                className="inline-flex h-[52px] items-center rounded-[10px] border border-white/30 px-8 text-[15px] font-semibold text-white transition-all duration-[180ms] hover:scale-[1.02] hover:bg-white/10 active:scale-[0.98]"
              >
                Discover Your Path →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
