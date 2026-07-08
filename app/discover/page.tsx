'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Input from '@/components/ui/Input';
import ProgressBar from '@/components/discover/ProgressBar';
import QuestionCard from '@/components/discover/QuestionCard';
import AnswerOption from '@/components/discover/AnswerOption';
import { PrimaryResultCard, SecondaryResultCard } from '@/components/discover/ResultCard';
import BridgeSection from '@/components/discover/BridgeSection';
import { careerProfiles, statusFragments } from '@/lib/data';

const TOTAL_STEPS = 6;

const statusOptions = [
  { icon: '🧭', label: "I have some ideas but I'm not sure which direction to go" },
  { icon: '🌀', label: "I'm completely lost — and that's okay, I'm here to figure it out" },
  { icon: '🎯', label: 'I know what I want but need guidance on how to get there' },
  { icon: '🔍', label: "I'm curious about my options before committing to anything" },
];

const interestOptions = [
  { icon: '🔨', label: 'Building & Creating' },
  { icon: '📊', label: 'Numbers & Analysis' },
  { icon: '🤝', label: 'People & Communication' },
  { icon: '💻', label: 'Technology & Systems' },
  { icon: '📈', label: 'Business & Strategy' },
  { icon: '🔬', label: 'Research & Learning' },
  { icon: '✦', label: 'Design & Aesthetics' },
  { icon: '⚡', label: 'Leadership & Impact' },
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

const loadingMessages = [
  'Analysing your answers...',
  'Matching to career pathways...',
  'Building your roadmap...',
  'Almost ready...',
];

type Phase = 'quiz' | 'loading' | 'results';

export default function DiscoverPage() {
  const [phase, setPhase] = useState<Phase>('quiz');
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<number | null>(null);
  const [interests, setInterests] = useState<number[]>([]);
  const [environment, setEnvironment] = useState<number | null>(null);
  const [strength, setStrength] = useState<number | null>(null);
  const [vision, setVision] = useState<number | null>(null);
  const [field, setField] = useState('');
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [saveNudge, setSaveNudge] = useState(false);

  // Cycle the thinking messages, then reveal results after 2.5s.
  useEffect(() => {
    if (phase !== 'loading') return;
    const cycle = setInterval(
      () => setLoadingIndex((i) => (i + 1) % loadingMessages.length),
      700,
    );
    const done = setTimeout(() => setPhase('results'), 2500);
    return () => {
      clearInterval(cycle);
      clearTimeout(done);
    };
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
      setPhase('loading');
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
    .map((i) => interestOptions[i].label.toLowerCase())
    .join(', ');
  const why = [
    `You told us ${statusFragments[status ?? 0]}, and that you light up around ${interestList || 'new challenges'}.`,
    field.trim() ? `With your background in ${field.trim()}, this path builds on what you already know.` : '',
    profile.primary.why,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[70vh] max-w-[1200px] px-5 pb-20 md:px-12">
        {phase === 'quiz' && (
          <div className="pt-10">
            <ProgressBar currentStep={step} />
            <div className="mt-10 flex justify-center">
              {step === 1 && (
                <QuestionCard step={1} totalSteps={TOTAL_STEPS} question="How would you describe yourself right now?">
                  <div className="space-y-3">
                    {statusOptions.map((o, i) => (
                      <AnswerOption
                        key={o.label}
                        icon={o.icon}
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
                  question="What topics genuinely excite you?"
                  subtext="Pick all that apply — there are no wrong answers."
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {interestOptions.map((o, i) => (
                      <AnswerOption
                        key={o.label}
                        icon={o.icon}
                        label={o.label}
                        selected={interests.includes(i)}
                        onClick={() => toggleInterest(i)}
                      />
                    ))}
                  </div>
                </QuestionCard>
              )}

              {step === 3 && (
                <QuestionCard step={3} totalSteps={TOTAL_STEPS} question="Which environment sounds most like you?">
                  <div className="space-y-3">
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
                <QuestionCard step={4} totalSteps={TOTAL_STEPS} question="What do people come to you for?">
                  <div className="space-y-3">
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
                <QuestionCard step={5} totalSteps={TOTAL_STEPS} question="In 10 years, which version of you sounds right?">
                  <div className="space-y-3">
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
                  question="One last thing — what are you studying or interested in?"
                  subtext="Optional, but it helps us personalise your results."
                >
                  <Input
                    placeholder="e.g. Computer Science, Business Administration..."
                    value={field}
                    onChange={(e) => setField(e.target.value)}
                    aria-label="Field of study"
                  />
                  <button
                    onClick={() => {
                      setField('');
                      next();
                    }}
                    className="mt-4 text-sm font-semibold text-amber-dark transition-colors hover:text-amber"
                  >
                    Skip this step →
                  </button>
                </QuestionCard>
              )}
            </div>

            <div className="mx-auto mt-8 flex max-w-[640px] items-center justify-between">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="rounded-[10px] px-5 py-3 text-sm font-semibold text-text-muted transition-colors hover:text-text-main"
                >
                  ← Back
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={next}
                disabled={!canContinue}
                className="inline-flex h-12 items-center rounded-[10px] bg-amber px-8 text-sm font-semibold text-white transition-all duration-[180ms] hover:scale-[1.02] hover:bg-amber-dark active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
              >
                {step === TOTAL_STEPS ? 'See My Results →' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="animate-fade-in text-center">
              <div className="mx-auto flex items-center justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-3.5 w-3.5 animate-pulse-soft rounded-full bg-amber"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
              <p
                key={loadingIndex}
                className="animate-fade-in mt-8 font-fraunces text-xl font-bold text-navy"
              >
                {loadingMessages[loadingIndex]}
              </p>
            </div>
          </div>
        )}

        {phase === 'results' && (
          <div className="pt-14">
            <header className="animate-fade-up text-center">
              <h1 className="font-fraunces text-[36px] font-black tracking-[-2px] text-navy md:text-[48px]">
                Here&apos;s what we found for you
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-[15px] text-text-muted">
                Based on your answers, these paths align with who you are and where you could excel.
              </p>
            </header>

            <div className="mt-12">
              <PrimaryResultCard
                match={profile.primary}
                why={why}
                africanMarket={profile.primary.africanMarket}
                roadmap={profile.primary.roadmap}
              />
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {profile.secondary.map((match) => (
                <SecondaryResultCard key={match.title} match={match} />
              ))}
            </div>

            <div className="mt-16">
              <BridgeSection sector={profile.primary.sector} />
            </div>

            <div className="mt-16 flex flex-col items-center gap-4 border-t pt-10">
              {saveNudge && (
                <p className="animate-fade-in rounded-xl bg-amber-light px-5 py-3 text-sm font-medium text-amber-dark">
                  Create your free Pathora account to keep these results.{' '}
                  <Link href="/dashboard" className="font-bold underline underline-offset-2">
                    Get started →
                  </Link>
                </p>
              )}
              <button
                onClick={() => setSaveNudge(true)}
                className="inline-flex h-12 items-center rounded-[10px] bg-amber px-8 text-sm font-semibold text-white transition-all duration-[180ms] hover:scale-[1.02] hover:bg-amber-dark active:scale-[0.98]"
              >
                Save your results
              </button>
              <button
                onClick={retake}
                className="text-sm font-medium text-text-muted transition-colors hover:text-text-main"
              >
                Retake the assessment
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
