/**
 * Sign-in helpers shared by server pages and client forms. Deliberately not a
 * 'use client' module: server components cannot call functions exported from one.
 */

/**
 * Only same-site paths are allowed as a return address, so a crafted link
 * cannot send someone to another website after they sign in.
 */
export function safeReturnPath(value: string | null | undefined, fallback: string): string {
  // '//x' and '/\x' both mean another website to a browser.
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: 'That email and password don’t match an account.',
  AccountExists:
    'This email already has a Pathora account with a password. Sign in with your password instead.',
  GoogleEmail: 'Your Google account needs a verified email address to sign in.',
  AccessDenied: 'Sign-in was cancelled.',
  Configuration: 'Sign-in is not set up correctly on the server. Please try again later.',
};

export const messageForError = (code?: string | null) =>
  code ? (ERROR_MESSAGES[code] ?? 'Something went wrong signing you in. Please try again.') : null;
