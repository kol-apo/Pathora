'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Star } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { ToastStack, type ToastData } from '@/components/ui/Toast';
import ConsultantCard from '@/components/consultant/ConsultantCard';
import BookingPanel from '@/components/consultant/BookingPanel';
import { toConsultant } from '@/lib/mentors';
import type { MentorDTO } from '@/lib/db/queries/dto';
import type { Consultant } from '@/lib/types';

/**
 * Previous roles for the experience timeline — one step back per consultant.
 *
 * Still sample content: the mentor model has no work-history field yet. Keyed
 * by name because database ids are not known ahead of time.
 */
const previousRoles: Record<string, { role: string; company: string; years: string }> = {
  'Taiwo Adeyemi': { role: 'Product Manager', company: 'Flutterwave', years: '2018 – 2021' },
  'Nkechi Okafor': { role: 'Audit Associate', company: 'KPMG Nigeria', years: '2020 – 2022' },
  'Chidi Eze': { role: 'Junior Developer', company: 'Andela', years: '2021 – 2023' },
  'Amara Diallo': { role: 'Brand Manager', company: 'Unilever West Africa', years: '2016 – 2020' },
  'Fatima Al-Hassan': { role: 'Graduate Trainee', company: 'PwC Nigeria', years: '2019 – 2021' },
  'Zainab Mensah': { role: 'Senior Designer', company: 'Big Cabal Media', years: '2018 – 2022' },
  'Tunde Bakare': { role: 'Operations Lead', company: 'Farmcrowdy', years: '2017 – 2019' },
  'David Okoro': { role: 'Video Editor', company: 'Zikoko', years: '2020 – 2023' },
};

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

async function getMentors(query: string): Promise<Consultant[]> {
  const res = await fetch(`/api/mentors?${query}`);
  if (!res.ok) return [];
  const data: { mentors: MentorDTO[] } = await res.json();
  return data.mentors.map(toConsultant);
}

export default function ConsultantProfilePage({ params }: { params: { id: string } }) {
  const [consultant, setConsultant] = useState<Consultant | null>(null);
  const [related, setRelated] = useState<Consultant[]>([]);
  const [load, setLoad] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoad('loading');

    fetch(`/api/mentors/${params.id}`)
      .then(async (res) => {
        // 400 is a malformed id — to a student that is simply "not found".
        if (res.status === 404 || res.status === 400) return 'not-found' as const;
        if (!res.ok) throw new Error(String(res.status));
        const data: { mentor: MentorDTO } = await res.json();
        return toConsultant(data.mentor);
      })
      .then(async (result) => {
        if (cancelled) return;
        if (result === 'not-found') {
          setLoad('not-found');
          return;
        }
        setConsultant(result);
        setLoad('ready');

        // Same sector first, topped up from other sectors so there are always three.
        const others = (list: Consultant[]) => list.filter((c) => c.id !== result.id);
        let picks = others(await getMentors(`sector=${encodeURIComponent(result.sector)}&limit=4`));
        if (picks.length < 3) {
          const rest = others(await getMentors('limit=8')).filter((c) => c.sector !== result.sector);
          picks = picks.concat(rest);
        }
        if (!cancelled) setRelated(picks.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setLoad('error');
      });

    return () => {
      cancelled = true;
    };
  }, [params.id, attempt]);

  const handleBooked = useCallback(
    (message: string) => setToasts((prev) => [...prev, { id: Date.now(), message }]),
    [],
  );

  if (load !== 'ready' || !consultant) {
    return <ProfileFallback state={load} onRetry={() => setAttempt((n) => n + 1)} />;
  }

  const previous = previousRoles[consultant.name];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-10">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
          Back to consultants
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          {/* ── Profile ─────────────────────────────────────── */}
          <div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar initials={consultant.initials} size="lg" />
              <div>
                <h1 className="text-[30px] font-bold tracking-[-0.03em] text-ink md:text-[36px]">
                  {consultant.name}
                </h1>
                <p className="mt-1 text-base text-muted">
                  {consultant.role} · {consultant.company}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge variant="sector">{consultant.sector}</Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12.5px] text-muted">
                <ShieldCheck size={13} strokeWidth={1.5} />
                Vetted by Pathora
              </span>
            </div>

            <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-muted">
              <span>{consultant.sessions} sessions</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-ink">
                <Star size={13} className="fill-ink text-ink" aria-hidden="true" />
                {consultant.rating.toFixed(1)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{consultant.experience} years experience</span>
              <span aria-hidden="true">·</span>
              <span>Replies in 24hrs</span>
            </p>

            <p className="mt-7 max-w-2xl text-base leading-relaxed text-ink">{consultant.bio}</p>

            <section className="mt-10">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">
                What I can help with
              </h2>
              <ul className="mt-4 space-y-3">
                {consultant.helpWith.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                    <span
                      className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-faint"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">Expertise</h2>
              <div className="mt-4 flex flex-wrap gap-[7px]">
                {consultant.tags.map((tag) => (
                  <Badge key={tag} variant="tag">
                    {tag}
                  </Badge>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">Experience</h2>
              <ol className="mt-5">
                <li className="relative flex gap-4 pb-7">
                  {previous && (
                    <span
                      className="absolute bottom-0 left-[5px] top-4 border-l border-line"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className="z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-ink"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink">{consultant.role}</p>
                    <p className="text-[13.5px] text-muted">{consultant.company} · Present</p>
                  </div>
                </li>
                {previous && (
                  <li className="flex gap-4">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-faint bg-white"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-medium text-ink">{previous.role}</p>
                      <p className="text-[13.5px] text-muted">
                        {previous.company} · {previous.years}
                      </p>
                    </div>
                  </li>
                )}
              </ol>
            </section>
          </div>

          {/* ── Booking card ────────────────────────────────── */}
          <aside className="min-w-0">
            <BookingPanel consultant={consultant} onBooked={handleBooked} />
          </aside>
        </div>

        {/* ── Related ───────────────────────────────────────── */}
        {related.length > 0 && (
          <section className="mt-16 border-t border-line pt-10">
            <h2 className="text-[26px] font-bold tracking-[-0.03em] text-ink">
              More consultants in {consultant.sector}
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => (
                <ConsultantCard key={c.id} consultant={c} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
      <ToastStack toasts={toasts} onClose={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </>
  );
}

/** Loading, missing and failed states — each with a way forward. */
function ProfileFallback({ state, onRetry }: { state: LoadState; onRetry: () => void }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-10">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={15} strokeWidth={1.5} />
          Back to consultants
        </Link>

        {state === 'loading' ? (
          <div
            className="mt-8 grid animate-pulse gap-10 lg:grid-cols-[1fr_380px]"
            aria-busy="true"
            aria-label="Loading consultant"
          >
            <div>
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-lg bg-fill" />
                <div className="flex flex-col gap-2.5">
                  <div className="h-8 w-56 rounded bg-fill" />
                  <div className="h-4 w-40 rounded bg-fill" />
                </div>
              </div>
              <div className="mt-8 h-4 w-full max-w-2xl rounded bg-fill" />
              <div className="mt-2.5 h-4 w-4/5 max-w-2xl rounded bg-fill" />
              <div className="mt-2.5 h-4 w-3/5 max-w-2xl rounded bg-fill" />
            </div>
            <div className="h-[340px] rounded-lg border border-line" />
          </div>
        ) : (
          <div className="mx-auto max-w-sm py-24 text-center">
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">
              {state === 'not-found'
                ? 'This consultant isn’t available'
                : 'We couldn’t load this consultant'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {state === 'not-found'
                ? 'The profile may have moved. Plenty of others are taking sessions.'
                : 'Check your connection and try again.'}
            </p>
            {state === 'not-found' ? (
              <Link
                href="/explore"
                className="mt-6 inline-block rounded bg-ink-soft px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black"
              >
                Browse all consultants
              </Link>
            ) : (
              <button
                onClick={onRetry}
                className="mt-6 rounded bg-ink-soft px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
