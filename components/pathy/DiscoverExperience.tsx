'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DiscoveryChat from '@/components/discover/DiscoveryChat';
import ReviewingState from '@/components/discover/ReviewingState';
import type { DiscoveryAnswers } from '@/lib/discovery/questions';
import PathyChat from './PathyChat';

/** The reviewing screen is a spec requirement, so results never appear sooner. */
const MIN_REVIEW_MS = 2500;

type Phase = 'questions' | 'reviewing' | 'chat' | 'failed';

/**
 * Career Discovery, start to finish: Pathy's six questions, the reviewing
 * screen while the result is generated and saved, then the conversation with
 * Pathy about that result. A student who already has a result starts in the
 * conversation, and can retake the questions from there.
 */
export default function DiscoverExperience({
  userId,
  firstName,
  latest,
}: {
  userId: string;
  firstName: string;
  latest: { id: string; title: string; sector: string; mentorCount: number } | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(latest ? 'chat' : 'questions');
  const [answers, setAnswers] = useState<DiscoveryAnswers | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [awaitingId, setAwaitingId] = useState<string | null>(null);

  // After a new result is saved, wait for the page's data to include it.
  useEffect(() => {
    if (awaitingId && latest?.id === awaitingId) {
      setAwaitingId(null);
      setPhase('chat');
      window.scrollTo({ top: 0 });
    }
  }, [awaitingId, latest]);

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
      .then((data: { resultId: string | null }) => data.resultId)
      .catch(() => null);

    Promise.all([request, minimumWait]).then(([resultId]) => {
      if (cancelled) return;
      if (!resultId) {
        setPhase('failed');
        return;
      }
      // Reload the page's data so the new result, its mentors and Pathy's
      // context come from the database; the effect above then opens the chat.
      setAwaitingId(resultId);
      router.refresh();
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // Answers are fixed by the time this phase begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const finishQuestions = useCallback((completed: DiscoveryAnswers) => {
    setAnswers(completed);
    window.scrollTo({ top: 0 });
    setPhase('reviewing');
  }, []);

  if (phase === 'chat' && latest) {
    return (
      <PathyChat
        key={latest.id}
        userId={userId}
        firstName={firstName}
        result={latest}
        mentorCount={latest.mentorCount}
        onRetake={() => {
          setChatKey((k) => k + 1);
          setPhase('questions');
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  if (phase === 'reviewing') return <ReviewingState />;

  if (phase === 'failed') {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">Pathy couldn&apos;t save that just now</h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-muted">Your answers are still here. Check your connection and try again.</p>
        <button
          onClick={() => setPhase('reviewing')}
          className="mt-6 rounded bg-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-navy-deep"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      {latest && (
        <div className="mx-auto max-w-[720px] px-5 pt-6 text-right md:px-6">
          <button
            onClick={() => setPhase('chat')}
            className="text-[13px] font-medium text-muted transition-colors hover:text-ink"
          >
            Back to my conversation with Pathy
          </button>
        </div>
      )}
      <DiscoveryChat key={chatKey} onComplete={finishQuestions} />
    </>
  );
}
