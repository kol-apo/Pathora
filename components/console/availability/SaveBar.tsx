'use client';

import { AlertCircle, Check, Loader2 } from 'lucide-react';

/** One Save button that stays in view (sticky) while there are unsaved changes. */
export default function SaveBar({
  dirty,
  busy,
  message,
  onSave,
}: {
  dirty: boolean;
  busy: boolean;
  message: { ok: boolean; text: string } | null;
  onSave: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-line bg-white/95 px-4 py-3 backdrop-blur ${
        dirty ? 'sticky bottom-[72px] z-30 shadow-[0_4px_24px_rgba(0,0,0,0.08)] lg:bottom-4' : ''
      }`}
    >
      <button
        onClick={onSave}
        disabled={busy || !dirty}
        className="flex shrink-0 items-center gap-2 rounded bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-50"
      >
        {busy && <Loader2 size={15} className="animate-spin" />}
        Save changes
      </button>
      {message ? (
        <p role="status" className="flex items-center gap-2 text-[13.5px] text-ink">
          {message.ok ? <Check size={15} className="text-available" /> : <AlertCircle size={15} />}
          {message.text}
        </p>
      ) : (
        <p className="text-[13.5px] text-muted">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
      )}
    </div>
  );
}
