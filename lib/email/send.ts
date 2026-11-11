/**
 * Sending email, through whichever service is configured (no SDKs):
 *
 *   Brevo (free, 300 emails a day, no domain needed)
 *     BREVO_API_KEY   from app.brevo.com, SMTP & API, API keys
 *     EMAIL_FROM      "Pathora <you@gmail.com>": an address verified in Brevo
 *                     (Senders, domains & dedicated IPs → Senders)
 *
 *   Resend (needs a verified domain to email anyone but the account owner)
 *     RESEND_API_KEY  from resend.com/api-keys
 *     EMAIL_FROM      "Pathora <hello@your-domain.org>"
 *
 * Brevo is used when its key is set, otherwise Resend. With neither, nothing
 * is sent: in development the email is printed to the server terminal so the
 * flow can still be tested; in production a warning is logged instead (never
 * the message, which may hold a reset link).
 */

export interface Email {
  to: string;
  /** The recipient's name, for the "To" line. */
  toName?: string;
  subject: string;
  /** Plain text. An HTML version is made from it. */
  text: string;
}

export interface SendResult {
  sent: boolean;
  /** Why it was not sent. For logs, never for the person using the site. */
  reason?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Plain text to simple, safe HTML: paragraphs, and bare links made clickable. */
export function textToHtml(text: string): string {
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map((p) =>
      escapeHtml(p)
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#1D3F5A">$1</a>')
        .replace(/\n/g, '<br>'),
    )
    .map((p) => `<p style="margin:0 0 14px">${p}</p>`)
    .join('');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:560px">${paragraphs}</div>`;
}

/** "Pathora <hi@x.org>" → { name: "Pathora", email: "hi@x.org" }; a bare address keeps the name "Pathora". */
export function parseSender(from: string | undefined): { name: string; email: string } | null {
  const value = from?.trim();
  if (!value) return null;
  const named = value.match(/^(.*?)\s*<([^>]+)>$/);
  if (named) return { name: named[1].replace(/^"|"$/g, '').trim() || 'Pathora', email: named[2].trim() };
  return /^[^\s@]+@[^\s@]+$/.test(value) ? { name: 'Pathora', email: value } : null;
}

type Provider = 'brevo' | 'resend';

export function emailProvider(env: Record<string, string | undefined> = process.env): Provider | null {
  if (env.BREVO_API_KEY?.trim()) return 'brevo';
  if (env.RESEND_API_KEY?.trim()) return 'resend';
  return null;
}

export async function sendEmail(email: Email, fetchImpl: typeof fetch = fetch): Promise<SendResult> {
  const provider = emailProvider();
  if (!provider) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`\n[email] No email service is set up, so this was not sent:\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    } else {
      console.warn(`[email] No email service is set up; "${email.subject}" was not sent.`);
    }
    return { sent: false, reason: 'no email service configured' };
  }

  const html = textToHtml(email.text);
  const request: { url: string; init: RequestInit } =
    provider === 'brevo'
      ? (() => {
          const sender = parseSender(process.env.EMAIL_FROM);
          return {
            url: 'https://api.brevo.com/v3/smtp/email',
            init: {
              method: 'POST',
              headers: { 'api-key': process.env.BREVO_API_KEY!.trim(), 'Content-Type': 'application/json', accept: 'application/json' },
              body: JSON.stringify({
                sender: sender ?? { name: 'Pathora', email: '' },
                to: [{ email: email.to, ...(email.toName ? { name: email.toName } : {}) }],
                subject: email.subject,
                textContent: email.text,
                htmlContent: html,
              }),
            },
          };
        })()
      : {
          url: 'https://api.resend.com/emails',
          init: {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM?.trim() || 'Pathora <onboarding@resend.dev>',
              to: [email.to],
              subject: email.subject,
              text: email.text,
              html,
            }),
          },
        };

  if (provider === 'brevo' && !parseSender(process.env.EMAIL_FROM)) {
    console.error('[email] Brevo needs EMAIL_FROM set to an address verified in Brevo.');
    return { sent: false, reason: 'EMAIL_FROM missing for Brevo' };
  }

  try {
    const res = await fetchImpl(request.url, { ...request.init, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[email] ${provider} refused "${email.subject}": HTTP ${res.status} ${body.slice(0, 200)}`);
      return { sent: false, reason: `HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error(`[email] could not reach ${provider} for "${email.subject}":`, (err as Error).message);
    return { sent: false, reason: (err as Error).message };
  }
}
