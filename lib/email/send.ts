/**
 * Sending email through Resend's HTTP API (no SDK needed).
 *
 *   RESEND_API_KEY  from resend.com/api-keys
 *   EMAIL_FROM      e.g. "Pathora <hello@your-domain.org>". Until a domain is
 *                   verified in Resend, only "onboarding@resend.dev" works,
 *                   and it delivers only to the Resend account's own address.
 *
 * Without a key, nothing is sent: in development the email is printed to the
 * server terminal so the flow can still be tested; in production a warning is
 * logged instead (never the message, which may hold a reset link).
 */

export interface Email {
  to: string;
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

export async function sendEmail(email: Email, fetchImpl: typeof fetch = fetch): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`\n[email] RESEND_API_KEY is not set, so this was not sent:\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    } else {
      console.warn(`[email] RESEND_API_KEY is not set; "${email.subject}" was not sent.`);
    }
    return { sent: false, reason: 'no RESEND_API_KEY' };
  }

  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM?.trim() || 'Pathora <onboarding@resend.dev>',
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: textToHtml(email.text),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[email] Resend refused "${email.subject}": HTTP ${res.status} ${body.slice(0, 200)}`);
      return { sent: false, reason: `HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error(`[email] could not reach Resend for "${email.subject}":`, (err as Error).message);
    return { sent: false, reason: (err as Error).message };
  }
}
