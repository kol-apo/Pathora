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
import { careerProfiles, statusFragments } from '@/lib/data';

const TOTAL_STEPS = 6;

const stepLabels = ['About you', 'Interests', 'Work style', 'Strengths', 'Vision', 'Context'];

const statusOptions = [
  "I have some ideas but I'm not sure which direction to go",
  "I'm completely lost — and that's okay, I'm here to figure it out",
  'I know what I want but need guidance on how to get there',
  "I'm curious about my options before committing to anything",
];

const interestOptions = [
  'Building and creating things',
  'Working with numbers, data, and analysis',
  'People, communication, and relationships',
  'Technology, systems, and how things work',
  'Business, markets, and strategy',
  'Art, design, and aesthetics',
  'Research, ideas, and learning',
  'Leadership, influence, and impact',
];

const environmentOptions = [
  'I like solving problems with logic and data',
  'I like building things people actually use',
  'I like understanding how markets and money work',
  'I like leading, communicating, and persuading people',
];

const strengthOptions = [
  'Explaining complex things in a simple way',
  "Figuring out why something isn't working",
  'Coming up with creative ideas',
  'Getting things organised and delivered',
  'Reading people and situations accurately',
];

const visionOptions = [
  'Running my own company',
  'Leading a team at a major organisation',
  'Being the expert everyone calls on',
  'Creating things that exist in the world',
  'Making systems and institutions work better',
];

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

  // The reviewing interstitial always runs for 2.5s before results appear.
  useEffect(() => {
    if (phase !== 'reviewing') return;
    const done = setTimeout(() => setPhase('results'), 2500);
    return () => clearTimeout(done);
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
    window.scrollTo({ top: 0 });
  };

  const profile = careerProfiles[environment ?? 1];
  const interestList = interests
    .slice(0, 3)
    .map((i) => interestOptions[i].toLowerCase())
    .join(', ');
  const why = [
    `You told us ${statusFragments[status ?? 0]}, and that you light up around ${interestList || 'new challenges'}.`,
    field.trim()
      ? `With your background in ${field.trim()}, this path builds on what you already know.`
      : '',
    profile.primary.why,
  ]
    .filter(Boolean)
    .join(' ');

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
              stepLabel={stepLabels[0]}
              question="Where are you right now?"
              subtext="Start honestly — the rest of this only works if this answer is true."
            >
              <div className="grid gap-3">
                {statusOptions.map((label, i) => (
                  <AnswerOption
                    key={label}
                    label={label}
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
              stepLabel={stepLabels[1]}
              question="What genuinely pulls your attention?"
              subtext="There is no wrong answer here. Pick everything that feels true, not what sounds impressive."
              hint="Select all that apply"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {interestOptions.map((label, i) => (
                  <AnswerOption
                    key={label}
                    label={label}
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
              stepLabel={stepLabels[2]}
              question="Which of these sounds most like you?"
            >
              <div className="grid gap-3">
                {environmentOptions.map((label, i) => (
                  <AnswerOption
                    key={label}
                    label={label}
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
              stepLabel={stepLabels[3]}
              question="What do people come to you for?"
            >
              <div className="grid gap-3">
                {strengthOptions.map((label, i) => (
                  <AnswerOption
                    key={label}
                    label={label}
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
              stepLabel={stepLabels[4]}
              question="In ten years, which version of you sounds right?"
            >
              <div className="grid gap-3">
                {visionOptions.map((label, i) => (
                  <AnswerOption
                    key={label}
                    label={label}
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
              stepLabel={stepLabels[5]}
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
            match={profile.primary}
            why={why}
            africanMarket={profile.primary.africanMarket}
            roadmap={profile.primary.roadmap}
          />
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {profile.secondary.map((match) => (
            <SecondaryResultCard key={match.title} match={match} />
          ))}
        </div>

        {/* Every discovery result ends here — results always bridge to people. */}
        <div className="mt-16">
          <BridgeSection sector={profile.primary.sector} />
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
