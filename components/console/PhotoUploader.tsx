'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Camera, Check, Loader2, Trash2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

const MAX_BYTES = 8 * 1024 * 1024; // matches PHOTO_MAX_BYTES in lib/media/cloudinary.ts
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,.heic';

/**
 * The mentor's headshot. The file goes from the browser straight to Cloudinary
 * with a signature from our server; the server then records it. While it
 * uploads, the chosen picture is already shown, so the mentor sees what they picked.
 */
export default function PhotoUploader({
  photo,
  initials,
  enabled,
}: {
  photo: string | null;
  initials: string;
  /** False when Cloudinary is not set up on the server. */
  enabled: boolean;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const upload = async (file: File) => {
    setMessage(null);
    if (!file.type.startsWith('image/') && !/\.heic$/i.test(file.name)) {
      setMessage({ ok: false, text: 'Choose a photo: JPG, PNG, WebP or HEIC.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      setMessage({ ok: false, text: 'That photo is over 8 MB. Choose a smaller one.' });
      return;
    }
    setPreview(URL.createObjectURL(file));
    setBusy('upload');
    try {
      // 1. Permission from our server.
      const signed = await fetch('/api/mentor/photo', { method: 'POST' });
      const s = await signed.json().catch(() => ({}));
      if (!signed.ok) throw new Error(s.error ?? 'Could not start the upload.');

      // 2. The file, straight to Cloudinary.
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', s.apiKey);
      form.append('signature', s.signature);
      for (const [k, v] of Object.entries(s.params as Record<string, string | number>)) form.append(k, String(v));
      const sent = await fetch(s.uploadUrl, { method: 'POST', body: form });
      const c = await sent.json().catch(() => ({}));
      if (!sent.ok) throw new Error(c.error?.message ?? 'The photo could not be uploaded.');

      // 3. Our server records it.
      const saved = await fetch('/api/mentor/photo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: c.version }),
      });
      const d = await saved.json().catch(() => ({}));
      if (!saved.ok) throw new Error(d.error ?? 'The photo could not be saved.');

      setMessage({ ok: true, text: 'Saved. Students now see your photo.' });
      router.refresh();
    } catch (err) {
      setPreview(null);
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'The photo could not be uploaded.' });
    } finally {
      setBusy(null);
      if (input.current) input.current.value = '';
    }
  };

  const remove = async () => {
    setMessage(null);
    setBusy('remove');
    const res = await fetch('/api/mentor/photo', { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setMessage({ ok: false, text: d.error ?? 'Could not remove your photo.' });
      return;
    }
    setPreview(null);
    setMessage({ ok: true, text: 'Removed. Students see your initials instead.' });
    router.refresh();
  };

  const shown = preview ?? photo;

  return (
    <section className="rounded-xl border border-line">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Profile photo</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          A clear, recent headshot, facing the camera. Shown to students on your card and profile. JPG, PNG, WebP or
          HEIC, up to 8 MB; it is cropped to a square around your face.
        </p>
      </div>
      <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          {/* A chosen file's preview is a local blob address, so it is shown with a plain img. */}
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-[104px] w-[104px] rounded-full object-cover" />
          ) : (
            <Avatar initials={initials} photo={shown} size="xl" />
          )}
          {busy === 'upload' && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/60">
              <Loader2 size={22} className="animate-spin text-navy" />
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {enabled ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => input.current?.click()}
                disabled={busy !== null}
                className="flex items-center gap-2 rounded bg-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-deep disabled:opacity-50"
              >
                <Camera size={16} />
                {photo ? 'Change photo' : 'Upload photo'}
              </button>
              {photo && (
                <button
                  onClick={remove}
                  disabled={busy !== null}
                  className="flex items-center gap-2 rounded border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-50"
                >
                  {busy === 'remove' ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Remove
                </button>
              )}
              <input
                ref={input}
                type="file"
                accept={ACCEPT}
                aria-label="Choose a profile photo"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </div>
          ) : (
            <p className="text-[13.5px] text-muted">Photo uploads are not set up yet. Your initials are shown instead.</p>
          )}
          {message && (
            <p role="status" className="flex items-center gap-2 text-[13.5px] text-ink">
              {message.ok ? <Check size={15} className="text-available" /> : <AlertCircle size={15} />}
              {message.text}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
