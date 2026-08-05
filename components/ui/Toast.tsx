'use client';

import { useEffect } from 'react';
import { Check, Info, X } from 'lucide-react';

export interface ToastData {
  id: number;
  message: string;
  type?: 'success' | 'info';
}

export function Toast({
  toast,
  onClose,
}: {
  toast: ToastData;
  onClose: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div className="animate-fade-up flex items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 shadow-raised">
      {toast.type === 'info' ? (
        <Info size={16} className="shrink-0 text-muted" />
      ) : (
        <Check size={16} className="shrink-0 text-available" />
      )}
      <p className="text-sm text-ink">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="ml-2 text-faint transition-colors hover:text-ink"
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function ToastStack({
  toasts,
  onClose,
}: {
  toasts: ToastData[];
  onClose: (id: number) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  );
}
