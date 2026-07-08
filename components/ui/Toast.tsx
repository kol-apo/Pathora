'use client';

import { useEffect } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';

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
    <div className="animate-slide-left flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-card-hover">
      {toast.type === 'info' ? (
        <Info size={18} className="shrink-0 text-navy" />
      ) : (
        <CheckCircle2 size={18} className="shrink-0 text-forest" />
      )}
      <p className="text-sm font-medium text-text-main">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="ml-2 text-text-light transition-colors hover:text-text-main"
        aria-label="Dismiss notification"
      >
        <X size={16} />
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
    <div className="fixed bottom-6 right-5 z-[100] flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  );
}
