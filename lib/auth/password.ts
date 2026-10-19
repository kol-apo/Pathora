import { z } from 'zod';

/** The one password rule, for sign-up and for resets. */
export const PasswordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(200)
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Use at least one letter and one number.');

export const PASSWORD_HINT = 'At least 8 characters, with a letter and a number.';
