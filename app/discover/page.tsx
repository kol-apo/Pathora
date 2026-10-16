'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import Footer from '@/components/layout/Footer';
import Navbar, { Wordmark } from '@/components/layout/Navbar';
import Guide from '@/components/brand/Guide';
import DiscoveryChat from '@/components/discover/DiscoveryChat';
import ReviewingState from '@/components/discover/ReviewingState';
import { PrimaryResultCard, SecondaryResultCard } from '@/components/discover/ResultCard';
import BridgeSection from '@/components/discover/BridgeSection';
import type { DiscoveryAnswers } from '@/lib/discovery/questions';
import type { CareerMatch } from '@/lib/ai/schema';

/** The reviewing screen is a spec requirement, so results never appear sooner. */
const MIN_REVIEW_MS = 2500;

type Phase = 'quiz' | 'reviewing' | 'results';

export default function DiscoverPage() {
  const [phase, setPhase] = useState<Phase>('quiz');
  const [answers, setAnswers] = useState<DiscoveryAnswers | null>(null);
  /** Remounts the conversation from the start on retake. */
  const [chatKey, setChatKey] = useState(0);
  const [saveNudge, setSaveNudge] = useState(false);
  const [match, setMatch] = useState<CareerMatch | null>(null);

  /**
   * Run the discovery agent while the reviewing screen is shown, and wait for
   * the animation's minimum duration as well as the request. A fast model must
   * not skip the interstitial, and a slow one must not cut it short.
   *
   * The API never fails outright — it degrades to the offline match — so there
   * is no error branch to strand the student in.
   */
  useEffect(() => {
    if (phase !== 'reviewing' || !answers) return;

    const controller = new AbortController();
    let cancelled = false;

    const minimumWait = new Promise((resolve) => setTimeout(resolve, MIN_REVIEW_MS));

    const request = fetch('/api/discovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answers),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { result: CareerMatch }) => data.result)
      .catch(() => null);

    Promise.all([request, minimumWait]).then(([result]) => {
      if (cancelled) return;
      setMatch(result);
      setPhase('results');
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // Answers are fixed by the time this phase begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const finishChat = useCallback((completed: DiscoveryAnswers) => {
    setAnswers(completed);
    window.scrollTo({ top: 0 });
    setPhase('reviewing');
  }, []);

  const retake = () => {
    setPhase('quiz');
    setAnswers(null);
    setChatKey((k) => k + 1);
    setSaveNudge(false);
    setMatch(null);
    window.scrollTo({ top: 0 });
  };

  /** The conversation and reviewing screens use a stripped-back header. */
  const quizHeader = (
    <header className="flex h-[68px] items-center justify-between border-b border-line px-5 md:px-10">
      <Wordmark />
      <Link
        href="/"
        className="flex items-center gap-2 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <X size={15} strokeWidth={1.5} className="text-faint" />
        Exit
      </Link>
    </header>
  );

  if (phase === 'quiz') {
    return (
      <>
        {quizHeader}
        <main>
          <DiscoveryChat key={chatKey} onComplete={finishChat} />
        </main>
      </>
    );
  }

  if (phase === 'reviewing') {
    return (
      <>
        {quizHeader}
        <main>
          <ReviewingState />
        </main>
      </>
    );
  }

  // Only reachable if the network dropped entirely — the API itself always
  // returns a result, degrading to the offline match rather than erroring.
  if (!match) {
    return (
      <>
        <Navbar />
        <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">
            We couldn&apos;t reach the guide
          </h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-muted">
            Your answers are still here. Check your connection and try again.
          </p>
          <button
            onClick={() => setPhase('reviewing')}
            className="mt-6 rounded bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
          >
            Try again
          </button>
        </main>
        <Footer />
      </>
    );
  }

  // Results are a normal browsing surface, so they get the full site chrome.
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-14 md:px-10">
        <header className="flex animate-fade-up flex-col gap-6 sm:flex-row sm:items-center">
          <Guide size={76} mood="happy" />
          <div>
            <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.03em] text-ink md:text-[38px]">
              Here&apos;s what we found for you
            </h1>
            <p className="mt-2.5 max-w-[560px] text-base leading-relaxed text-muted">
              Based on your answers, these paths align with who you are and where you could excel.
            </p>
          </div>
        </header>

        <div className="mt-10">
          <PrimaryResultCard
            match={match.primary}
            why={match.primary.why}
            africanMarket={match.primary.africanMarket}
            roadmap={match.primary.roadmap}
          />
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {match.secondary.map((s) => (
            <SecondaryResultCard key={s.title} match={s} />
          ))}
        </div>

        {/* Every discovery result ends here — results always bridge to people. */}
        <div className="mt-16">
          <BridgeSection sector={match.primary.sector} />
        </div>

        <div className="mt-16 flex flex-col items-center gap-4 border-t border-line pt-10">
          {saveNudge && (
            <p className="animate-fade-in rounded-lg bg-sky-soft px-5 py-3 text-sm text-navy">
              Create your free Pathora account to keep these results.{' '}
              <Link href="/signup" className="font-medium text-ink underline underline-offset-2">
                Get started
              </Link>
            </p>
          )}
          <button
            onClick={() => setSaveNudge(true)}
            className="rounded bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
          >
            Save your results
          </button>
          <button
            onClick={retake}
            className="text-sm font-medium text-muted transition-colors hover:text-ink"
          >
            Retake the assessment
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
