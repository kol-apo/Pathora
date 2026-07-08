'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, CheckCircle2, ShieldCheck, Star } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ToastStack, type ToastData } from '@/components/ui/Toast';
import ConsultantCardCompact from '@/components/consultant/ConsultantCardCompact';
import { consultants, getConsultant } from '@/lib/data';

/** Previous roles for the experience timeline — one step back per consultant. */
const previousRoles: Record<string, { role: string; company: string; years: string }> = {
  '1': { role: 'Product Manager', company: 'Flutterwave', years: '2018 – 2021' },
  '2': { role: 'Audit Associate', company: 'KPMG Nigeria', years: '2020 – 2022' },
  '3': { role: 'Junior Developer', company: 'Andela', years: '2021 – 2023' },
  '4': { role: 'Brand Manager', company: 'Unilever West Africa', years: '2016 – 2020' },
  '5': { role: 'Graduate Trainee', company: 'PwC Nigeria', years: '2019 – 2021' },
  '6': { role: 'Operations Lead', company: 'Farmcrowdy', years: '2017 – 2019' },
};

export default function ConsultantProfilePage({ params }: { params: { id: string } }) {
  const consultant = getConsultant(params.id) ?? consultants[0];
  const [booked, setBooked] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const related = consultants
    .filter((c) => c.sector === consultant.sector && c.id !== consultant.id)
    .concat(consultants.filter((c) => c.sector !== consultant.sector))
    .slice(0, 3);

  const previous = previousRoles[consultant.id];

  const handleBook = () => {
    setBooked(true);
    setToasts((prev) => [
      ...prev,
      { id: Date.now(), message: `Session with ${consultant.name} requested!` },
    ]);
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1200px] px-5 pb-20 pt-10 md:px-12">
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-amber-dark"
        >
          <ArrowLeft size={16} />
          Back to Consultants
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          {/* ── Profile content ─────────────────────────────── */}
          <div className="animate-fade-up">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar initials={consultant.initials} color={consultant.avatarColor} size="xl" />
              <div>
                <h1 className="font-fraunces text-[30px] font-extrabold tracking-tight text-navy md:text-[36px]">
                  {consultant.name}
                </h1>
                <p className="mt-1 text-base text-text-muted">
                  {consultant.role} · {consultant.company}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge variant="sector">{consultant.sector}</Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-light px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.8px] text-forest">
                <ShieldCheck size={13} />
                Vetted by Pathora
              </span>
            </div>

            <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-muted">
              <span>{consultant.sessions} Sessions</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Star size={13} className="fill-amber text-amber" />
                {consultant.rating.toFixed(1)} Rating
              </span>
              <span aria-hidden="true">·</span>
              <span>Replies in 24hrs</span>
            </p>

            <p className="mt-7 max-w-2xl text-base leading-relaxed text-text-main">
              {consultant.bio}
            </p>

            <section className="mt-10">
              <h2 className="font-fraunces text-xl font-bold text-navy">What I can help with</h2>
              <ul className="mt-4 space-y-3">
                {consultant.helpWith.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-text-main">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10">
              <h2 className="font-fraunces text-xl font-bold text-navy">Expertise</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {consultant.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-warm-gray px-3.5 py-1.5 text-[13px] font-medium text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-fraunces text-xl font-bold text-navy">Experience</h2>
              <ol className="mt-5">
                <li className="relative flex gap-4 pb-7">
                  <span className="absolute left-[5px] top-4 bottom-0 border-l-2 border-dashed border-amber/40" />
                  <span className="z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full bg-amber" />
                  <div>
                    <p className="font-semibold text-navy">{consultant.role}</p>
                    <p className="text-sm text-text-muted">
                      {consultant.company} · Present
                    </p>
                  </div>
                </li>
                {previous && (
                  <li className="flex gap-4">
                    <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 border-amber/50 bg-white" />
                    <div>
                      <p className="font-semibold text-navy">{previous.role}</p>
                      <p className="text-sm text-text-muted">
                        {previous.company} · {previous.years}
                      </p>
                    </div>
                  </li>
                )}
              </ol>
            </section>
          </div>

          {/* ── Sticky booking card ─────────────────────────── */}
          <aside>
            <div className="sticky top-[96px] rounded-2xl border bg-white p-7 shadow-card">
              <h2 className="font-fraunces text-xl font-bold text-navy">Book a Free Session</h2>
              <p className="mt-2 text-sm text-text-muted">1:1 Video Session · 45 minutes · Free</p>
              <p
                className={`mt-3 inline-flex items-center gap-1.5 text-sm font-medium ${
                  consultant.available ? 'text-forest' : 'text-text-light'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${consultant.available ? 'bg-forest' : 'border border-text-light'}`}
                />
                {consultant.available ? 'Available this week' : 'Fully booked this week'}
              </p>

              <div className="mt-5 flex h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-warm-gray/60 text-text-light">
                <CalendarDays size={26} />
                <p className="text-xs font-medium">Session scheduling loads here</p>
              </div>

              {booked ? (
                <div className="mt-5 rounded-xl bg-forest-light p-4 text-center">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-forest">
                    <CheckCircle2 size={17} />
                    Session requested!
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {consultant.name.split(' ')[0]} will confirm within 24 hours.{' '}
                    <Link href="/dashboard" className="font-semibold text-amber-dark hover:underline">
                      View in dashboard →
                    </Link>
                  </p>
                </div>
              ) : (
                <Button size="lg" fullWidth className="mt-5" onClick={handleBook}>
                  Book Your Session
                </Button>
              )}

              <p className="mt-4 text-center text-xs text-text-light">
                Sessions held on Pathora Video · Powered by secure scheduling
              </p>
              <p className="mt-4 flex items-center justify-center gap-2 border-t pt-4 text-xs font-medium text-text-muted">
                <ShieldCheck size={14} className="text-forest" />
                Reviewed and approved by the Pathora team
              </p>
            </div>
          </aside>
        </div>

        {/* ── Related consultants ───────────────────────────── */}
        <section className="mt-16">
          <h2 className="font-fraunces text-2xl font-bold text-navy">
            More consultants in {consultant.sector}
          </h2>
          <div className="no-scrollbar mt-6 flex gap-4 overflow-x-auto pb-2">
            {related.map((c) => (
              <div key={c.id} className="w-[340px] shrink-0">
                <ConsultantCardCompact consultant={c} />
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <ToastStack toasts={toasts} onClose={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </>
  );
}
