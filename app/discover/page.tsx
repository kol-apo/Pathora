'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, X } from 'lucide-react';
import Footer from '@/components/layout/Footer';
import Navbar, { Wordmark } from '@/components/layout/Navbar';
import Input from '@/components/ui/Input';
import QuestionCard from '@/components/discover/QuestionCard';
import AnswerOption from '@/components/discover/AnswerOption';
import ReviewingState from '@/components/discover/ReviewingState';
import { PrimaryResultCard, SecondaryResultCard } from '@/components/discover/ResultCard';
import BridgeSection from '@/components/discover/BridgeSection';
import {
  ENVIRONMENT_OPTIONS,
  INTEREST_OPTIONS,
  STATUS_OPTIONS,
  STEP_LABELS,
  STRENGTH_OPTIONS,
  TOTAL_STEPS,
  VISION_OPTIONS,
  type DiscoveryAnswers,
} from '@/lib/discovery/questions';
import type { CareerMatch } from '@/lib/ai/schema';

/** The reviewing screen is a spec requirement, so results never appear sooner. */
const MIN_REVIEW_MS = 2500;

type Phase = 'quiz' | 'reviewing' | 'results';

export default function DiscoverPage() {
  const [phase, setPhase] = useState<Phase>('quiz');
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<number | null>(null);
  const [interests, setInterests] = useState<number[]>([]);
  const [environment, setEnvironment] = useState<number | null>(null);
  const [strength, setStrength] = useState<number | null>(null);
  const [vision, setVision] = useState<number | null>(null);
  const [field, setField] = useState('');
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
    if (phase !== 'reviewing') return;

    const controller = new AbortController();
    let cancelled = false;

    const answers: DiscoveryAnswers = {
      status: status ?? 0,
      interests,
      environment: environment ?? 0,
      strength: strength ?? 0,
      vision: vision ?? 0,
      field: field.trim() || undefined,
    };

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

  const toggleInterest = (i: number) =>
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const canContinue =
    (step === 1 && status !== null) ||
    (step === 2 && interests.length > 0) ||
    (step === 3 && environment !== null) ||
    (step === 4 && strength !== null) ||
    (step === 5 && vision !== null) ||
    step === 6;

  const next = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      window.scrollTo({ top: 0 });
      setPhase('reviewing');
    }
  };

  const retake = () => {
    setPhase('quiz');
    setStep(1);
    setStatus(null);
    setInterests([]);
    setEnvironment(null);
    setStrength(null);
    setVision(null);
    setField('');
    setSaveNudge(false);
    setMatch(null);
    window.scrollTo({ top: 0 });
  };

  /** The questionnaire and reviewing screens use a stripped-back header. */
  const quizHeader = (
    <header className="flex h-[68px] items-center justify-between border-b border-line px-5 md:px-10">
      <Wordmark />
      <Link
        href="/"
        className="flex items-center gap-2 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <X size={15} strokeWidth={1.5} className="text-faint" />
        Save and exit
      </Link>
    </header>
  );

  if (phase === 'quiz') {
    return (
      <>
        {quizHeader}
        <main className="mx-auto max-w-[760px] px-5 pb-[88px] pt-16 md:px-10">
          {step === 1 && (
            <QuestionCard
              step={1}
              totalSteps={TOTAL_STEPS}
              stepLabel={STEP_LABELS[0]}
              question="Where are you right now?"
              subtext="Start honestly — the rest of this only works if this answer is true."
            >
              <div className="grid gap-3">
                {STATUS_OPTIONS.map((o, i) => (
                  <AnswerOption
                    key={o.label}
                    label={o.label}
                    selected={status === i}
                    onClick={() => setStatus(i)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {step === 2 && (
            <QuestionCard
              step={2}
              totalSteps={TOTAL_STEPS}
              stepLabel={STEP_LABELS[1]}
              question="What genuinely pulls your attention?"
              subtext="There is no wrong answer here. Pick everything that feels true, not what sounds impressive."
              hint="Select all that apply"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {INTEREST_OPTIONS.map((o, i) => (
                  <AnswerOption
                    key={o.label}
                    label={o.label}
                    multi
                    selected={interests.includes(i)}
                    onClick={() => toggleInterest(i)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {step === 3 && (
            <QuestionCard
              step={3}
              totalSteps={TOTAL_STEPS}
              stepLabel={STEP_LABELS[2]}
              question="Which of these sounds most like you?"
            >
              <div className="grid gap-3">
                {ENVIRONMENT_OPTIONS.map((o, i) => (
                  <AnswerOption
                    key={o.label}
                    label={o.label}
                    selected={environment === i}
                    onClick={() => setEnvironment(i)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {step === 4 && (
            <QuestionCard
              step={4}
              totalSteps={TOTAL_STEPS}
              stepLabel={STEP_LABELS[3]}
              question="What do people come to you for?"
            >
              <div className="grid gap-3">
                {STRENGTH_OPTIONS.map((o, i) => (
                  <AnswerOption
                    key={o.label}
                    label={o.label}
                    selected={strength === i}
                    onClick={() => setStrength(i)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {step === 5 && (
            <QuestionCard
              step={5}
              totalSteps={TOTAL_STEPS}
              stepLabel={STEP_LABELS[4]}
              question="In ten years, which version of you sounds right?"
            >
              <div className="grid gap-3">
                {VISION_OPTIONS.map((o, i) => (
                  <AnswerOption
                    key={o.label}
                    label={o.label}
                    selected={vision === i}
                    onClick={() => setVision(i)}
                  />
                ))}
              </div>
            </QuestionCard>
          )}

          {step === 6 && (
            <QuestionCard
              step={6}
              totalSteps={TOTAL_STEPS}
              stepLabel={STEP_LABELS[5]}
              question="Last one — what are you studying?"
              subtext="Optional, but it lets us tie the result back to what you already know."
              hint="Optional"
            >
              <Input
                placeholder="e.g. Computer Science, Business Administration"
                value={field}
                onChange={(e) => setField(e.target.value)}
                aria-label="Field of study"
              />
              <button
                onClick={() => {
                  setField('');
                  next();
                }}
                className="mt-4 text-sm font-medium text-muted transition-colors hover:text-ink"
              >
                Skip this step →
              </button>
            </QuestionCard>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-line pt-7">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 rounded border border-line px-[18px] py-[11px] text-sm font-medium text-ink transition-colors hover:bg-surface"
              >
                <ArrowLeft size={15} strokeWidth={1.5} />
                Back
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-4">
              {step === 2 && interests.length > 0 && (
                <span className="text-[13.5px] text-faint">{interests.length} selected</span>
              )}
              <button
                onClick={next}
                disabled={!canContinue}
                className="rounded bg-ink-soft px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black disabled:pointer-events-none disabled:opacity-40"
              >
                {step === TOTAL_STEPS ? 'See my results' : 'Continue'}
              </button>
            </div>
          </div>
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
            className="mt-6 rounded bg-ink-soft px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black"
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
        <header className="animate-fade-up">
          <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.03em] text-ink md:text-[38px]">
            Here&apos;s what we found for you
          </h1>
          <p className="mt-2.5 max-w-[560px] text-base leading-relaxed text-muted">
            Based on your answers, these paths align with who you are and where you could excel.
          </p>
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
            <p className="animate-fade-in rounded-lg bg-surface px-5 py-3 text-sm text-muted">
              Create your free Pathora account to keep these results.{' '}
              <Link href="/dashboard" className="font-medium text-ink underline underline-offset-2">
                Get started
              </Link>
            </p>
          )}
          <button
            onClick={() => setSaveNudge(true)}
            className="rounded bg-ink-soft px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black"
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
