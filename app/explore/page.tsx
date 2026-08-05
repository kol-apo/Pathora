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

type SortKey = 'experience' | 'rating' | 'booked';

const sortLabels: Record<SortKey, string> = {
  experience: 'Most experienced',
  rating: 'Highest rated',
  booked: 'Most booked',
};

const PAGE_SIZE = 6;

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('All');
  const [sort, setSort] = useState<SortKey>('experience');
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = consultants.filter((c) => {
      const inSector = sector === 'All' || c.sector === sector;
      const inQuery =
        q === '' ||
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.focus.some((f) => f.toLowerCase().includes(q)) ||
        c.tags.some((t) => t.toLowerCase().includes(q));
      return inSector && inQuery;
    });
    return [...matches].sort((a, b) =>
      sort === 'experience'
        ? b.experience - a.experience
        : sort === 'rating'
          ? b.rating - a.rating
          : b.sessions - a.sessions,
    );
  }, [query, sector, sort]);

  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);
  const remaining = filtered.length - visible.length;

  const resetFilters = () => {
    setQuery('');
    setSector('All');
    setShowAll(false);
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1440px]">
        <header className="px-5 pb-8 pt-14 md:px-10">
          <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.03em] text-ink md:text-[38px]">
            Find your consultant
          </h1>
          <p className="mt-2.5 max-w-[560px] text-base leading-relaxed text-muted">
            Vetted professionals across Africa, giving free sessions to students. Browse by sector,
            book a video call.
          </p>
        </header>

        {/* Search, sort, and the sticky sector bar */}
        <div className="sticky top-[68px] z-40 border-b border-line bg-white px-5 pb-5 pt-4 md:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              icon={<Search size={17} strokeWidth={1.5} />}
              placeholder="Search by name, role, company or skill"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowAll(false);
              }}
              aria-label="Search consultants"
              className="flex-1"
            />
            <div className="relative shrink-0">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
                Sort
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Sort consultants"
                className="h-[46px] w-full appearance-none rounded border border-line bg-white pl-[52px] pr-10 text-sm font-medium text-ink focus:border-ink focus:outline-none"
              >
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {sortLabels[key]}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                strokeWidth={1.5}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
          </div>

          <div className="mt-[18px] flex flex-wrap items-center justify-between gap-3">
            <SectorFilter
              active={sector}
              onChange={(s) => {
                setSector(s);
                setShowAll(false);
              }}
            />
            <p className="text-[13.5px] text-muted" aria-live="polite">
              {filtered.length} consultant{filtered.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {filtered.length > 0 ? (
          <>
            <div
              className={`grid gap-5 px-5 pt-6 md:grid-cols-2 md:px-10 lg:grid-cols-3 ${
                remaining > 0 ? '' : 'pb-14'
              }`}
            >
              {visible.map((c) => (
                <ConsultantCard key={c.id} consultant={c} />
              ))}
            </div>

            {remaining > 0 && (
              <div className="flex justify-center px-5 pb-14 pt-8 md:px-10">
                <button
                  onClick={() => setShowAll(true)}
                  className="rounded border border-line px-[22px] py-[11px] text-sm font-medium text-ink transition-colors hover:bg-surface"
                >
                  Show {remaining} more consultant{remaining === 1 ? '' : 's'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="mx-auto max-w-sm px-5 py-24 text-center">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">
              No consultants match that
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Try a different search, or browse every sector.
            </p>
            <button
              onClick={resetFilters}
              className="mt-6 rounded bg-ink-soft px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black"
            >
              Browse all consultants
            </button>
          </div>
        )}

        {/* Consultant recruitment banner */}
        <section
          id="join"
          className="on-dark mx-5 mb-16 flex flex-col gap-6 rounded-lg bg-ink p-8 md:mx-10 md:flex-row md:items-center md:justify-between md:p-10"
        >
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-white">
              Are you a professional?
            </h2>
            <p className="mt-2 text-[15px] text-white/65">
              Give one free session a month. Change a student&apos;s trajectory.
            </p>
          </div>
          <Link
            href="#"
            className="shrink-0 self-start rounded bg-white px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-white/90 md:self-auto"
          >
            Join as a consultant
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
