import { randomInt } from 'crypto';

/**
 * Pseudonymous participant codes, e.g. "P-7KQ4MX".
 *
 * Random rather than sequential, so a code reveals nothing about when or in
 * what order someone joined. Letters and digits that are easy to confuse
 * (0/O, 1/I/L) are left out, in case a participant ever has to read theirs out.
 * Server-only (uses Node's crypto).
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateParticipantCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `P-${code}`;
}

export const PARTICIPANT_CODE_PATTERN = /^P-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/;
