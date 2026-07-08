'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Input from '@/components/ui/Input';
import ConsultantCard from '@/components/consultant/ConsultantCard';
import SectorFilter from '@/components/consultant/SectorFilter';
import { consultants } from '@/lib/data';

type SortKey = 'booked' | 'rating' | 'experience';

const sortLabels: Record<SortKey, string> = {
  booked: 'Most Booked',
  rating: 'Highest Rated',
  experience: 'Most Experienced',
};

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('All');
  const [sort, setSort] = useState<SortKey>('booked');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = consultants.filter((c) => {
      const inSector = sector === 'All' || c.sector === sector;
      const inQuery =
        q === '' ||
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q);
      return inSector && inQuery;
    });
    return [...matches].sort((a, b) =>
      sort === 'booked'
        ? b.sessions - a.sessions
        : sort === 'rating'
          ? b.rating - a.rating
          : b.experience - a.experience,
    );
  }, [query, sector, sort]);

  return (
    <>
      <Navbar />
      <main>
        <div className="mx-auto max-w-[1200px] px-5 md:px-12">
          <header className="animate-fade-up pb-8 pt-14">
            <h1 className="font-fraunces text-[36px] font-extrabold tracking-[-1.5px] text-navy md:text-[48px]">
              Find your consultant
            </h1>
            <p className="mt-3 max-w-xl text-[15px] text-text-muted">
              Browse vetted professionals ready to help you navigate your career in Africa.
            </p>
          </header>
        </div>

        {/* Sticky search + filter bar */}
        <div className="sticky top-[72px] z-40 border-b-2 border-amber/60 bg-cream/95 py-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 md:px-12 lg:flex-row lg:items-center">
            <Input
              icon={<Search size={17} />}
              placeholder="Search by name, role, or company..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search consultants"
              className="lg:max-w-sm lg:flex-1"
            />
            <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
              <SectorFilter active={sector} onChange={setSector} />
              <div className="flex items-center gap-4">
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    aria-label="Sort consultants"
                    className="h-10 appearance-none rounded-[10px] border bg-white pl-4 pr-9 text-sm font-medium text-text-main focus:border-amber focus:outline-none"
                  >
                    {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                      <option key={key} value={key}>
                        {sortLabels[key]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-light"
                  />
                </div>
                <p className="whitespace-nowrap text-sm text-text-muted" aria-live="polite">
                  {filtered.length} consultant{filtered.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] px-5 py-10 md:px-12">
          {filtered.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <div key={c.id} className="animate-fade-in">
                  <ConsultantCard consultant={c} />
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-fade-in mx-auto max-w-sm py-16 text-center">
              <p className="text-5xl" aria-hidden="true">
                🧭
              </p>
              <h2 className="mt-5 font-fraunces text-xl font-bold text-navy">
                No consultants found
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                Try a different search or browse all sectors.
              </p>
              <button
                onClick={() => {
                  setQuery('');
                  setSector('All');
                }}
                className="mt-6 inline-flex h-11 items-center rounded-[10px] bg-amber px-6 text-sm font-semibold text-white transition-all duration-[180ms] hover:scale-[1.02] hover:bg-amber-dark active:scale-[0.98]"
              >
                Browse All Consultants
              </button>
            </div>
          )}
        </div>

        {/* Join as consultant banner */}
        <section id="join" className="bg-navy py-14">
          <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-6 px-5 md:flex-row md:items-center md:justify-between md:px-12">
            <div>
              <h2 className="font-fraunces text-2xl font-extrabold text-white md:text-[28px]">
                Are you a professional?
              </h2>
              <p className="mt-2 text-[15px] text-white/60">
                Share your expertise with African students.
              </p>
            </div>
            <Link
              href="#"
              className="inline-flex h-12 shrink-0 items-center rounded-[10px] border border-white/30 px-7 text-sm font-semibold text-white transition-all duration-[180ms] hover:scale-[1.02] hover:bg-white/10 active:scale-[0.98]"
            >
              Join as a Consultant →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
