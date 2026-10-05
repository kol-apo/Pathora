'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CalendarDays, Check, Loader2, ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { groupSlotsByDay, type Slot } from '@/lib/booking/slots';
import type { SlotDTO } from '@/lib/db/queries/dto';
import type { Consultant } from '@/lib/types';

/**
 * The booking card on a consultant's profile.
 *
 *   idle → loading → picking → submitting → done
 *                       ↑            │
 *                       └── 409 ─────┘   slot was just taken: reload and re-pick
 *
 * Times are shown in the student's own timezone. The server only ever sees the
 * slot's UTC instant, exactly as the slots endpoint returned it.
 */

type Step = 'idle' | 'loading' | 'picking' | 'submitting' | 'done';

const DEFAULT_TOPIC = 'Career guidance session';

const studentZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const longFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export default function BookingPanel({
  consultant,
  onBooked,
}: {
  consultant: Consultant;
  onBooked: (message: string) => void;
}) {
  const [step, setStep] = useState<Step>('idle');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [day, setDay] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [topic, setTopic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bookedAt, setBookedAt] = useState<Date | null>(null);

  const available = consultant.nextSlot === null;
  const firstName = consultant.name.split(' ')[0];

  const days = useMemo(() => groupSlotsByDay(slots, studentZone()), [slots]);
  const daySlots = days.find((d) => d.date === day)?.slots ?? [];

  /** Load open times. `keepError` preserves a "slot was taken" message across the reload. */
  const loadSlots = async (keepError = false) => {
    setStep('loading');
    setSelected(null);
    if (!keepError) setError(null);

    try {
      const res = await fetch(`/api/mentors/${consultant.id}/slots`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not load open times.');

      const loaded: Slot[] = (data.slots as SlotDTO[]).map((s) => ({
        startsAt: new Date(s.startsAt),
        endsAt: new Date(s.endsAt),
      }));
      setSlots(loaded);
      setDay(loaded.length ? groupSlotsByDay(loaded, studentZone())[0].date : null);
      setStep('picking');
    } catch (err) {
      setSlots([]);
      setError(err instanceof Error ? err.message : 'Could not load open times.');
      setStep('picking');
    }
  };

  const confirm = async () => {
    if (!selected) return;
    setStep('submitting');
    setError(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentorId: consultant.id,
          // Sent back exactly as received — the server matches it to a slot start.
          startsAt: selected.startsAt.toISOString(),
          topic: topic.trim() || DEFAULT_TOPIC,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setBookedAt(selected.startsAt);
        setStep('done');
        onBooked(`Session with ${consultant.name} requested`);
        return;
      }

      if (res.status === 409 && (data.code === 'SLOT_TAKEN' || data.code === 'SLOT_UNAVAILABLE')) {
        // Someone else got there first. Say so plainly, then show fresh times.
        setError(
          `Someone just booked ${longFormat.format(selected.startsAt)}. Please pick another time — the list below is up to date.`,
        );
        await loadSlots(true);
        return;
      }

      setError(data.error ?? 'Something went wrong, and your session was not booked. Please try again.');
      setStep('picking');
    } catch {
      setError('We couldn’t reach Pathora. Check your connection — your session was not booked.');
      setStep('picking');
    }
  };

  const reset = () => {
    setStep('idle');
    setSelected(null);
    setError(null);
  };

  return (
    <div className="sticky top-[92px] rounded-lg border border-line p-[22px]">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink">Book a free session</h2>
      <p className="mt-2 text-[13.5px] text-muted">1:1 video session · 45 minutes · Free</p>
      <p className="mt-3 flex items-center gap-[7px] text-[13px]">
        <span
          className={`h-1.5 w-1.5 rounded-full ${available ? 'bg-available' : 'bg-faint'}`}
          aria-hidden="true"
        />
        <span className={available ? 'text-available' : 'text-muted'}>
          {available ? 'Available this week' : `Next slot ${consultant.nextSlot}`}
        </span>
      </p>

      {step === 'idle' && (
        <>
          <div className="mt-5 flex h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface text-faint">
            <CalendarDays size={24} strokeWidth={1.5} />
            <p className="text-[12.5px]">Pick a time in the next step</p>
          </div>
          <Button size="lg" fullWidth className="mt-5" onClick={() => loadSlots()}>
            Book a Session
          </Button>
        </>
      )}

      {/* Above both the loader and the picker, so a "slot taken" notice stays
          on screen while the fresh times load. */}
      {error && step !== 'idle' && step !== 'done' && (
        <div
          role="alert"
          className="mt-5 flex gap-2.5 rounded-lg border border-line bg-surface p-3.5 text-[12.5px] leading-relaxed text-ink"
        >
          <AlertCircle size={15} strokeWidth={1.5} className="mt-px shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {step === 'loading' && (
        <div
          className="mt-5 flex h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface text-faint"
          aria-live="polite"
        >
          <Loader2 size={22} strokeWidth={1.5} className="animate-spin" />
          <p className="text-[12.5px]">Loading open times…</p>
        </div>
      )}

      {(step === 'picking' || step === 'submitting') && (
        <div className="mt-5">
          {days.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-surface px-4 py-6 text-center">
              <p className="text-sm font-medium text-ink">No open times right now</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                {firstName} hasn&apos;t opened new slots yet.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="secondary" size="sm" fullWidth onClick={() => loadSlots()}>
                  Check again
                </Button>
                <Link
                  href="/explore"
                  className="text-[12.5px] font-medium text-ink underline underline-offset-2"
                >
                  Browse other consultants
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-micro uppercase text-muted">Pick a day</p>
              <div
                className="-mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-1"
                role="listbox"
                aria-label="Available days"
              >
                {days.map((d) => {
                  const first = d.slots[0].startsAt;
                  const active = d.date === day;
                  return (
                    <button
                      key={d.date}
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setDay(d.date);
                        setSelected(null);
                      }}
                      className={`flex w-[62px] shrink-0 flex-col items-center rounded border py-2 transition-colors ${
                        active
                          ? 'border-ink bg-ink text-white'
                          : 'border-line text-ink hover:bg-surface'
                      }`}
                    >
                      <span className={`text-[11px] ${active ? 'text-white/70' : 'text-muted'}`}>
                        {dayFormat.format(first)}
                      </span>
                      <span className="text-[13px] font-medium">{dateFormat.format(first)}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-micro uppercase text-muted">Pick a time</p>
              <div className="mt-2.5 grid grid-cols-3 gap-2" role="listbox" aria-label="Available times">
                {daySlots.map((s) => {
                  const active = selected?.startsAt.getTime() === s.startsAt.getTime();
                  return (
                    <button
                      key={s.startsAt.toISOString()}
                      role="option"
                      aria-selected={active}
                      onClick={() => setSelected(s)}
                      className={`h-9 rounded border text-[13px] font-medium transition-colors ${
                        active
                          ? 'border-ink bg-ink text-white'
                          : 'border-line text-ink hover:bg-surface'
                      }`}
                    >
                      {timeFormat.format(s.startsAt)}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[12px] text-faint">Times shown in your timezone ({studentZone()})</p>

              <Input
                className="mt-4"
                placeholder="What do you want to talk about? (optional)"
                value={topic}
                maxLength={200}
                onChange={(e) => setTopic(e.target.value)}
                aria-label="Session topic"
              />

              <Button
                size="lg"
                fullWidth
                className="mt-4"
                disabled={!selected || step === 'submitting'}
                onClick={confirm}
              >
                {step === 'submitting' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Booking…
                  </>
                ) : selected ? (
                  `Book ${longFormat.format(selected.startsAt)}`
                ) : (
                  'Choose a time'
                )}
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            fullWidth
            className="mt-2"
            onClick={reset}
            disabled={step === 'submitting'}
          >
            Cancel
          </Button>
        </div>
      )}

      {step === 'done' && bookedAt && (
        <div className="mt-5 rounded-lg bg-surface p-4 text-center">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-ink">
            <Check size={16} strokeWidth={2} className="text-available" />
            Session requested
          </p>
          <p className="mt-1 text-[13px] font-medium text-ink">{longFormat.format(bookedAt)}</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
            {firstName} will confirm within 24 hours.{' '}
            <Link href="/dashboard" className="font-medium text-ink underline underline-offset-2">
              View in dashboard
            </Link>
          </p>
        </div>
      )}

      <p className="mt-4 flex items-center justify-center gap-2 border-t border-line pt-4 text-[12.5px] text-muted">
        <ShieldCheck size={13} strokeWidth={1.5} className="text-faint" />
        Reviewed and approved by the Pathora team
      </p>
    </div>
  );
}
