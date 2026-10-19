/**
 * The site's own address, for links in emails.
 *
 * Never taken from the request in production: a request can claim any Host,
 * and a password-reset link pointing at someone else's site would hand them
 * the token. APP_URL is the address to set; on Vercel the production domain
 * is used if APP_URL is missing. Only in development does the request decide.
 */
export function appUrl(request?: Request): string | null {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  if (process.env.NODE_ENV !== 'production' && request) return new URL(request.url).origin;
  return null;
}
