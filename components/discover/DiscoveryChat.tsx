'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, RotateCcw } from 'lucide-react';
import Guide from '@/components/brand/Guide';
import ProgressBar from '@/components/discover/ProgressBar';
import {
  ENVIRONMENT_OPTIONS,
  INTEREST_OPTIONS,
  STATUS_OPTIONS,
  STRENGTH_OPTIONS,
  TOTAL_STEPS,
  VISION_OPTIONS,
  type Choice,
  type DiscoveryAnswers,
} from '@/lib/discovery/questions';

/**
 * Career discovery as a conversation with Pathy, the Pathora guide.
 *
 * It asks the same six questions as before, from lib/discovery/questions.ts,
 * and produces the same DiscoveryAnswers, so the AI receives exactly what it
 * did. Only the interface changed: one question at a time, answered with
 * quick replies, in a chat.
 *
 * Self-contained on purpose: it takes nothing but an onComplete callback, so
 * the same conversation can run as first-time onboarding once sign-up exists.
 */

type Kind = 'single' | 'multi' | 'text';
type Key = 'status' | 'interests' | 'environment' | 'strength' | 'vision' | 'field';

interface Question {
  key: Key;
  kind: Kind;
  text: string;
  sub?: string;
  options?: Choice[];
}

const QUESTIONS: Question[] = [
  {
    key: 'status',
    kind: 'single',
    text: 'First, where are you right now?',
    sub: 'Be honest. The rest only works if this answer is true.',
    options: STATUS_OPTIONS,
  },
  {
    key: 'interests',
    kind: 'multi',
    text: 'What genuinely pulls your attention?',
    sub: 'Pick everything that feels true, not what sounds impressive.',
    options: INTEREST_OPTIONS,
  },
  { key: 'environment', kind: 'single', text: 'Which of these sounds most like you?', options: ENVIRONMENT_OPTIONS },
  { key: 'strength', kind: 'single', text: 'What do people come to you for?', options: STRENGTH_OPTIONS },
  { key: 'vision', kind: 'single', text: 'In ten years, which version of you sounds right?', options: VISION_OPTIONS },
  {
    key: 'field',
    kind: 'text',
    text: 'Last one. What are you studying?',
    sub: 'Optional, but it lets me connect your result to what you already know.',
  },
];

const INTRO = [
  "Hi, I'm Pathy, your Pathora guide.",
  "I'll ask you six quick questions, then point you to a direction and to people already working in it. After that, you can ask me anything about your path. There are no wrong answers.",
];

const STATUS_ACKS = [
  'Having some ideas is a good place to start.',
  "That's completely okay. We'll figure it out together.",
  "Great. Then let's find the clearest route there.",
  'Exploring before you commit is smart.',
];

interface Message {
  id: number;
  from: 'guide' | 'student';
  text: string;
  sub?: string;
}

interface Snapshot {
  messages: number;
  step: number;
  answers: Partial<DiscoveryAnswers>;
}

/** How long the Guide "types" before a message appears. */
const typingDelay = (text: string) => Math.min(1400, 450 + text.length * 12);

export default function DiscoveryChat({
  onComplete,
}: {
  onComplete: (answers: DiscoveryAnswers) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [queue, setQueue] = useState<Omit<Message, 'id'>[]>(() => [
    ...INTRO.map((text) => ({ from: 'guide' as const, text })),
    { from: 'guide' as const, text: QUESTIONS[0].text, sub: QUESTIONS[0].sub },
  ]);
  const [typing, setTyping] = useState(false);
  /** Index of the question awaiting an answer; TOTAL_STEPS once finished. */
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<DiscoveryAnswers>>({});
  const [picked, setPicked] = useState<number[]>([]);
  const [field, setField] = useState('');
  const [history, setHistory] = useState<Snapshot[]>([]);

  const nextId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const done = step >= TOTAL_STEPS;
  const question = QUESTIONS[step];
  const waiting = typing || queue.length > 0;

  // Play queued Guide messages one at a time, with a typing pause before each.
  useEffect(() => {
    if (queue.length === 0) return;
    setTyping(true);
    const timer = setTimeout(() => {
      const [head, ...rest] = queue;
      setMessages((m) => [...m, { ...head, id: nextId.current++ }]);
      setQueue(rest);
      setTyping(false);
    }, typingDelay(queue[0].text));
    return () => clearTimeout(timer);
  }, [queue]);

  // Hand the answers over once the closing message has been shown.
  useEffect(() => {
    if (!done || waiting) return;
    const timer = setTimeout(() => onComplete(answers as DiscoveryAnswers), 700);
    return () => clearTimeout(timer);
  }, [done, waiting, answers, onComplete]);

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, typing, waiting]);

  const answer = useCallback(
    (studentText: string, value: Partial<DiscoveryAnswers>, ack: string) => {
      setHistory((h) => [...h, { messages: messages.length, step, answers }]);
      const nextAnswers = { ...answers, ...value };
      setAnswers(nextAnswers);
      setMessages((m) => [...m, { id: nextId.current++, from: 'student', text: studentText }]);
      setPicked([]);
      setField('');

      const next = QUESTIONS[step + 1];
      setQueue(
        next
          ? [
              { from: 'guide', text: ack },
              { from: 'guide', text: next.text, sub: next.sub },
            ]
          : [
              { from: 'guide', text: ack },
              { from: 'guide', text: "That's everything. Give me a moment to put it together." },
            ],
      );
      setStep(step + 1);
    },
    [answers, messages.length, step],
  );

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setQueue([]);
    setTyping(false);
    // Drop the answer and everything after it, then show the question again.
    setMessages((m) => m.slice(0, last.messages));
    setAnswers(last.answers);
    setStep(last.step);
    setPicked([]);
    setField('');
  };

  const chooseSingle = (i: number) => {
    const q = question;
    const label = q.options![i].label;
    const ack =
      q.key === 'status'
        ? STATUS_ACKS[i]
        : q.key === 'strength'
          ? "That's a real strength."
          : q.key === 'vision'
            ? 'I like that.'
            : 'Got it.';
    answer(label, { [q.key]: i } as Partial<DiscoveryAnswers>, ack);
  };

  const submitInterests = () => {
    const labels = picked.map((i) => INTEREST_OPTIONS[i].label);
    answer(
      labels.join(' · '),
      { interests: [...picked].sort((a, b) => a - b) },
      picked.length >= 3 ? "That's a broad mix. Useful to know." : 'Noted.',
    );
  };

  const submitField = (skip: boolean) => {
    const value = skip ? '' : field.trim();
    answer(
      value || 'Skip this one',
      { field: value || undefined },
      value ? `Great. I'll connect your result to ${value}.` : 'No problem.',
    );
  };

  const lastGuideId = [...messages].reverse().find((m) => m.from === 'guide')?.id;

  return (
    <div className="flex min-h-[calc(100vh-68px)] flex-col">
      {/* Progress */}
      <div className="sticky top-14 z-10 border-b border-line bg-white/90 backdrop-blur lg:top-0">
        <div className="mx-auto flex max-w-[720px] items-center gap-4 px-5 py-3 md:px-6">
          <div className="flex-1">
            <ProgressBar currentStep={Math.min(step + (done ? 0 : 1), TOTAL_STEPS)} totalSteps={TOTAL_STEPS} />
          </div>
          <span className="shrink-0 text-[12.5px] tabular-nums text-muted">
            {done ? 'Done' : `Question ${step + 1} of ${TOTAL_STEPS}`}
          </span>
        </div>
      </div>

      {/* Conversation */}
      <div className="mx-auto w-full max-w-[720px] flex-1 px-5 pb-8 pt-10 md:px-6">
        <div className="mb-10 flex flex-col items-center text-center">
          <Guide size={84} mood={done ? 'happy' : typing ? 'talking' : 'idle'} />
          <p className="mt-5 text-[15px] font-semibold text-ink">Speak with Pathy</p>
          <p className="mt-0.5 text-[13px] text-muted">Six questions · about 2 minutes</p>
        </div>

        <div className="flex flex-col gap-3" role="log" aria-live="polite" aria-label="Conversation with Pathy">
          {messages.map((m) =>
            m.from === 'guide' ? (
              <div key={m.id} className="flex animate-pop-in items-end gap-2.5 motion-reduce:animate-none">
                <div className="w-8 shrink-0">
                  {m.id === lastGuideId && !typing && <Guide size={32} track={false} />}
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-sky-muted bg-sky-soft px-4 py-3">
                  <p className="text-[15px] leading-relaxed text-ink">{m.text}</p>
                  {m.sub && <p className="mt-1 text-[13px] leading-relaxed text-muted">{m.sub}</p>}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex animate-pop-in justify-end motion-reduce:animate-none">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-navy px-4 py-3 text-[15px] leading-relaxed text-white">
                  {m.text}
                </p>
              </div>
            ),
          )}

          {typing && (
            <div className="flex items-end gap-2.5" aria-label="The Guide is typing">
              <Guide size={32} mood="talking" track={false} />
              <div className="flex gap-1 rounded-2xl rounded-bl-md border border-sky-muted bg-sky-soft px-4 py-4">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-typing rounded-full bg-navy motion-reduce:animate-none"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
          {/* Replies */}
          {!done && !waiting && question && (
            <div className="mt-2 animate-fade-up pl-[42px] motion-reduce:animate-none">
              <div>
                {question.kind === 'single' && (
                  <div className="flex flex-wrap justify-end gap-2">
                    {question.options!.map((o, i) => (
                      <button
                        key={o.label}
                        onClick={() => chooseSingle(i)}
                        className="rounded-full border border-sky-muted bg-white px-4 py-2.5 text-left text-[14px] text-ink transition-colors hover:border-navy hover:bg-sky-soft"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}

                {question.kind === 'multi' && (
                  <>
                    <div className="flex flex-wrap justify-end gap-2" role="group" aria-label="Choose all that apply">
                      {question.options!.map((o, i) => {
                        const on = picked.includes(i);
                        return (
                          <button
                            key={o.label}
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => setPicked((p) => (on ? p.filter((x) => x !== i) : [...p, i]))}
                            className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[14px] transition-colors ${
                              on
                                ? 'border-navy bg-navy text-white'
                                : 'border-sky-muted bg-white text-ink hover:border-navy hover:bg-sky-soft'
                            }`}
                          >
                            {on && <Check size={14} strokeWidth={2.25} />}
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-3">
                      <span className="text-[13px] text-muted">
                        {picked.length ? `${picked.length} selected` : 'Choose all that apply'}
                      </span>
                      <button
                        onClick={submitInterests}
                        disabled={picked.length === 0}
                        className="rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-deep disabled:pointer-events-none disabled:opacity-40"
                      >
                        Continue
                      </button>
                    </div>
                  </>
                )}

                {question.kind === 'text' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (field.trim()) submitField(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={field}
                      onChange={(e) => setField(e.target.value)}
                      placeholder="e.g. Computer Science, Business Administration"
                      aria-label="What you are studying"
                      className="h-12 min-w-0 flex-1 rounded-full border border-sky-muted px-5 text-[15px] text-ink placeholder:text-faint focus:border-navy focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!field.trim()}
                      aria-label="Send"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-white transition-colors hover:bg-navy-deep disabled:opacity-40"
                    >
                      <ArrowUp size={18} strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      onClick={() => submitField(true)}
                      className="shrink-0 px-2 text-sm font-medium text-muted transition-colors hover:text-navy"
                    >
                      Skip
                    </button>
                  </form>
                )}

                {history.length > 0 && (
                  <button
                    onClick={undo}
                    className="ml-auto mt-3 flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-navy"
                  >
                    <RotateCcw size={13} strokeWidth={1.75} />
                    Change my last answer
                  </button>
                )}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

    </div>
  );
}
