import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroJourney from '@/components/landing/HeroJourney';
import { ClosingCta, HowItWorks, Sectors, Testimonials } from '@/components/landing/LandingSections';
import { consultants } from '@/lib/data';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1440px]">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="grid items-center gap-12 px-5 py-16 md:px-10 lg:grid-cols-2 lg:py-24">
          <div className="max-w-xl">
            <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.03em] text-ink md:text-[56px]">
              Your career{' '}
              <span className="relative inline-block">
                path
                <svg
                  viewBox="0 0 120 14"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1.5 left-0 h-3 w-full md:-bottom-2"
                  aria-hidden="true"
                >
                  <path
                    d="M3 10 C 30 3, 70 2, 117 6"
                    pathLength={1}
                    fill="none"
                    stroke="#96CAD3"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeDasharray="1"
                    className="animate-draw motion-reduce:animate-none"
                    style={{ animationDelay: '0.3s' }}
                  />
                </svg>
              </span>{' '}
              starts here, not after.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
              Vetted professionals across Africa, giving free sessions to students. Find your
              direction, then talk to someone already working in it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/explore"
                className="rounded bg-navy px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
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
            <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-line pt-6">
              {[
                ['120+', 'Vetted consultants'],
                ['4', 'Sectors'],
                ['Free', 'To start'],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="mt-0.5 text-[12.5px] text-muted">{label}</dt>
                  <dd className="text-xl font-bold tracking-[-0.02em] text-navy">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-[13px] leading-relaxed text-faint">
              500+ students already building their careers across Nigeria, Rwanda &amp; beyond.
            </p>
          </div>

          <HeroJourney consultant={consultants[0]} />
        </section>

        <HowItWorks consultant={consultants[1]} />
        <Sectors consultants={consultants} />
        <Testimonials />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
