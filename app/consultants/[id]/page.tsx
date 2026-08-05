'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Check, ShieldCheck, Star } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ToastStack, type ToastData } from '@/components/ui/Toast';
import ConsultantCard from '@/components/consultant/ConsultantCard';
import { consultants, getConsultant } from '@/lib/data';

/** Previous roles for the experience timeline — one step back per consultant. */
const previousRoles: Record<string, { role: string; company: string; years: string }> = {
  '1': { role: 'Product Manager', company: 'Flutterwave', years: '2018 – 2021' },
  '2': { role: 'Audit Associate', company: 'KPMG Nigeria', years: '2020 – 2022' },
  '3': { role: 'Junior Developer', company: 'Andela', years: '2021 – 2023' },
  '4': { role: 'Brand Manager', company: 'Unilever West Africa', years: '2016 – 2020' },
  '5': { role: 'Graduate Trainee', company: 'PwC Nigeria', years: '2019 – 2021' },
  '6': { role: 'Senior Designer', company: 'Big Cabal Media', years: '2018 – 2022' },
  '7': { role: 'Operations Lead', company: 'Farmcrowdy', years: '2017 – 2019' },
  '8': { role: 'Video Editor', company: 'Zikoko', years: '2020 – 2023' },
};

export default function ConsultantProfilePage({ params }: { params: { id: string } }) {
  const consultant = getConsultant(params.id) ?? consultants[0];
  const [booked, setBooked] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const available = consultant.nextSlot === null;
  const previous = previousRoles[consultant.id];
  const related = consultants
    .filter((c) => c.sector === consultant.sector && c.id !== consultant.id)
    .concat(consultants.filter((c) => c.sector !== consultant.sector && c.id !== consultant.id))
    .slice(0, 3);

  const handleBook = () => {
    setBooked(true);
    setToasts((prev) => [
      ...prev,
      { id: Date.now(), message: `Session with ${consultant.name} requested` },
    ]);
  };

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
          <aside>
            <div className="sticky top-[92px] rounded-lg border border-line p-[22px]">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">
                Book a free session
              </h2>
              <p className="mt-2 text-[13.5px] text-muted">
                1:1 video session · 45 minutes · Free
              </p>
              <p className="mt-3 flex items-center gap-[7px] text-[13px]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${available ? 'bg-available' : 'bg-faint'}`}
                  aria-hidden="true"
                />
                <span className={available ? 'text-available' : 'text-muted'}>
                  {available ? 'Available this week' : `Next slot ${consultant.nextSlot}`}
                </span>
              </p>

              <div className="mt-5 flex h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface text-faint">
                <CalendarDays size={24} strokeWidth={1.5} />
                <p className="text-[12.5px]">Session scheduling loads here</p>
              </div>

              {booked ? (
                <div className="mt-5 rounded-lg bg-surface p-4 text-center">
                  <p className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                    <Check size={16} strokeWidth={2} className="text-available" />
                    Session requested
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                    {consultant.name.split(' ')[0]} will confirm within 24 hours.{' '}
                    <Link
                      href="/dashboard"
                      className="font-medium text-ink underline underline-offset-2"
                    >
                      View in dashboard
                    </Link>
                  </p>
                </div>
              ) : (
                <Button size="lg" fullWidth className="mt-5" onClick={handleBook}>
                  Book a Session
                </Button>
              )}

              <p className="mt-4 flex items-center justify-center gap-2 border-t border-line pt-4 text-[12.5px] text-muted">
                <ShieldCheck size={13} strokeWidth={1.5} className="text-faint" />
                Reviewed and approved by the Pathora team
              </p>
            </div>
          </aside>
        </div>

        {/* ── Related ───────────────────────────────────────── */}
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
      </main>
      <Footer />
      <ToastStack toasts={toasts} onClose={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </>
  );
}
