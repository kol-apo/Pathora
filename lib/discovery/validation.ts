import { z } from 'zod';
import {
  ENVIRONMENT_OPTIONS,
  INTEREST_OPTIONS,
  STATUS_OPTIONS,
  STRENGTH_OPTIONS,
  VISION_OPTIONS,
} from './questions';

/**
 * Validation for questionnaire submissions.
 *
 * Bounds are derived from the option lists themselves, so adding a question
 * option cannot leave the validator behind. Kept out of `questions.ts` so the
 * client bundle does not pull in zod just to render the form.
 */

const indexInto = (list: unknown[], name: string) =>
  z
    .number()
    .int(`${name} must be an integer index`)
    .min(0, `${name} is out of range`)
    .max(list.length - 1, `${name} is out of range`);

export const DiscoveryAnswersSchema = z.object({
  status: indexInto(STATUS_OPTIONS, 'status'),
  interests: z
    .array(indexInto(INTEREST_OPTIONS, 'interests'))
    .min(1, 'Pick at least one interest')
    .max(INTEREST_OPTIONS.length)
    // Duplicated indices would double-count in the sector scoring.
    .refine((v) => new Set(v).size === v.length, 'interests must not repeat'),
  environment: indexInto(ENVIRONMENT_OPTIONS, 'environment'),
  strength: indexInto(STRENGTH_OPTIONS, 'strength'),
  vision: indexInto(VISION_OPTIONS, 'vision'),
  field: z.string().trim().max(120).optional(),
});

export type ValidatedAnswers = z.infer<typeof DiscoveryAnswersSchema>;
