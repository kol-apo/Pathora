'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Briefcase, Map as MapIcon, RotateCcw, Users } from 'lucide-react';
import Guide from '@/components/brand/Guide';
import RichText from './RichText';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

/** Chats live only on this device, and only for a day after the last message. */
const KEEP_MS = 24 * 3_600_000;
const MAX_CHARS = 1200;

const SUGGESTIONS = [
  'What should I focus on this month?',
  'Which opportunities fit me right now?',
  'What should I ask my mentor in a first session?',
  'How do I make my CV fit this path?',
];

interface Saved {
  updatedAt: number;
  turns: Turn[];
}

function load(key: string): Turn[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const saved = JSON.parse(raw) as Saved;
    if (!Array.isArray(saved.turns) || Date.now() - saved.updatedAt > KEEP_MS) {
      localStorage.removeItem(key);
      return [];
    }
    return saved.turns.filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string');
  } catch {
    return [];
  }
}

function save(key: string, turns: Turn[]) {
  try {
    if (turns.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify({ updatedAt: Date.now(), turns } satisfies Saved));
  } catch {
    // Storage blocked or full: the chat still works, it just will not survive a reload.
  }
}

/**
 * The conversation with Pathy after discovery. Pathy already knows the
 * student's answers, direction, roadmap and mentors (the server adds them to
 * every request), so the student can just ask.
 */
export default function PathyChat({
  userId,
  firstName,
  result,
  mentorCount,
  onRetake,
}: {
  userId: string;
  firstName: string;
  result: { id: string; title: string; sector: string };
  mentorCount: number;
  onRetake: () => void;
}) {
  // One conversation per result: retaking the questions starts a fresh one.
  const storageKey = `pathora.pathy.${userId}.${result.id}`;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setTurns(load(storageKey)), [storageKey]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, busy]);

  const send = async (text: string) => {
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content || busy) return;
    const next = [...turns, { role: 'user' as const, content }];
    setTurns(next);
    save(storageKey, next);
    setDraft('');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/pathy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Pathy could not answer. Please try again.');
      const withReply = [...next, { role: 'assistant' as const, content: String(data.reply) }];
      setTurns(withReply);
      save(storageKey, withReply);
    } catch (err) {
      setError((err as Error).message || 'Pathy could not answer. Please try again.');
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const clear = () => {
    setTurns([]);
    save(storageKey, []);
    setError(null);
  };

  const greeting = `Hi${firstName ? ` ${firstName}` : ''}! Your direction is **${result.title}**, in ${result.sector}. I've saved your roadmap${
    mentorCount > 0 ? ` and matched you with ${mentorCount} mentors` : ''
  }. Ask me anything about getting there: what to do first, applications, opportunities, or what to ask your mentors.`;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[760px] flex-col px-5 pt-8 md:px-6 lg:min-h-screen">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3.5">
          <Guide size={52} mood={busy ? 'talking' : 'idle'} />
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Speak with Pathy</h1>
            <p className="text-[13.5px] text-muted">
              Your direction: <span className="font-medium text-ink">{result.title}</span> · {result.sector}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/discover/results/${result.id}`}
            className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
          >
            <MapIcon size={14} strokeWidth={1.75} /> Roadmap
          </Link>
          <Link
            href="/dashboard#matches"
            className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
          >
            <Users size={14} strokeWidth={1.75} /> Mentors
          </Link>
          <Link
            href="/opportunities"
            className="inline-flex items-center gap-1.5 rounded border border-line px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-surface"
          >
            <Briefcase size={14} strokeWidth={1.75} /> Opportunities
          </Link>
        </div>
      </header>

      {/* Conversation */}
      <div className="flex flex-1 flex-col gap-3 py-6" role="log" aria-live="polite" aria-label="Conversation with Pathy">
        <PathyBubble text={greeting} />
        {turns.map((t, i) =>
          t.role === 'assistant' ? (
            <PathyBubble key={i} text={t.content} />
          ) : (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-navy px-4 py-3 text-[15px] leading-relaxed text-white">
                {t.content}
              </p>
            </div>
          ),
        )}

        {busy && (
          <div className="flex items-end gap-2.5" aria-label="Pathy is typing">
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

        {turns.length === 0 && !busy && (
          <div className="flex flex-wrap gap-2 pl-[42px]" aria-label="Suggested questions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-sky-muted bg-white px-4 py-2 text-left text-[13.5px] text-ink transition-colors hover:border-navy hover:bg-sky-soft"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p role="alert" className="ml-[42px] rounded-lg border border-line bg-surface px-4 py-3 text-[13.5px] text-ink">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer: above the phone tab bar, at the bottom on larger screens */}
      <div className="sticky bottom-16 border-t border-line bg-white pb-4 pt-3 lg:bottom-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(draft);
          }}
          className="flex items-end gap-2 rounded-2xl border border-line bg-white p-2 focus-within:border-navy"
        >
          <label htmlFor="pathy-input" className="sr-only">
            Message Pathy
          </label>
          <textarea
            id="pathy-input"
            ref={inputRef}
            value={draft}
            maxLength={MAX_CHARS}
            rows={1}
            placeholder="Ask Pathy about your path…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-ink outline-none placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white transition-colors hover:bg-navy-deep disabled:opacity-40"
          >
            <ArrowUp size={18} strokeWidth={2} />
          </button>
        </form>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] text-faint">
          <span>
            Pathy runs on Google&apos;s AI: don&apos;t share your name, contact details or other personal information. Chats
            stay on this device for 24 hours. Pathy can make mistakes; check details on the publisher&apos;s site.
          </span>
          <span className="flex gap-3">
            {turns.length > 0 && (
              <button type="button" onClick={clear} className="font-medium text-muted hover:text-ink">
                Clear chat
              </button>
            )}
            <button type="button" onClick={onRetake} className="inline-flex items-center gap-1 font-medium text-muted hover:text-ink">
              <RotateCcw size={12} /> Retake the six questions
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

function PathyBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 shrink-0 pt-1">
        <Guide size={32} track={false} />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-sky-muted bg-sky-soft px-4 py-3 text-[15px] leading-relaxed text-ink">
        <RichText text={text} />
      </div>
    </div>
  );
}
