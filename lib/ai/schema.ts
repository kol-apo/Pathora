import { z } from 'zod';
import { SECTORS, type Sector } from '@/lib/types';

/**
 * The contract every provider must satisfy.
 *
 * Model output is untrusted input — it arrives as free-form text that merely
 * claims to be JSON. Everything crossing this boundary is validated, and the
 * bounds below are deliberately tight so a rambling or truncated response is
 * rejected rather than rendered.
 */

// Typed as Sector, not string, so validated output flows straight into
// components and Mongoose models without a cast.
const SectorEnum = z.enum(SECTORS as [Sector, ...Sector[]]);

export const RoadmapPhaseSchema = z.object({
  period: z.string().min(1).max(40),
  focus: z.string().min(1).max(120),
  actions: z.array(z.string().min(1).max(300)).min(2).max(5),
});

export const SecondaryMatchSchema = z.object({
  title: z.string().min(1).max(80),
  sector: SectorEnum,
  description: z.string().min(1).max(600),
  skills: z.array(z.string().min(1).max(60)).min(1).max(8),
});

export const PrimaryMatchSchema = z.object({
  title: z.string().min(1).max(80),
  sector: SectorEnum,
  description: z.string().min(1).max(400),
  why: z.string().min(1).max(1200),
  africanMarket: z.string().min(1).max(600),
  skills: z.array(z.string().min(1).max(60)).min(3).max(8),
  roadmap: z.array(RoadmapPhaseSchema).min(2).max(4),
});

export const CareerMatchSchema = z.object({
  primary: PrimaryMatchSchema,
  secondary: z.array(SecondaryMatchSchema).min(1).max(3),
});

export type CareerMatch = z.infer<typeof CareerMatchSchema>;
export type PrimaryMatch = z.infer<typeof PrimaryMatchSchema>;
export type SecondaryMatch = z.infer<typeof SecondaryMatchSchema>;
export type RoadmapPhase = z.infer<typeof RoadmapPhaseSchema>;

/**
 * Pull a JSON object out of a model response.
 *
 * Models ignore "reply with only JSON" often enough that this has to be
 * defensive: responses come wrapped in ```json fences, prefixed with "Sure!",
 * or trailed with an explanation. Tries the cheapest interpretation first.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through to recovery.
  }

  // Strip a fenced code block, with or without a language tag.
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // Fall through.
    }
  }

  // Last resort: the widest brace-delimited span.
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(trimmed.slice(first, last + 1));
    } catch {
      // Fall through.
    }
  }

  throw new Error('Model response contained no parsable JSON object.');
}

export interface ParseFailure {
  ok: false;
  error: string;
}

export interface ParseSuccess {
  ok: true;
  value: CareerMatch;
}

/** Parse and validate raw model text. Never throws — inspect `ok`. */
export function parseCareerMatch(text: string): ParseSuccess | ParseFailure {
  let json: unknown;
  try {
    json = extractJson(text);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const result = CareerMatchSchema.safeParse(json);
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 4)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    return { ok: false, error: `Schema validation failed — ${detail}` };
  }

  return { ok: true, value: result.data };
}

/** The JSON shape, rendered for inclusion in the prompt. */
export const RESPONSE_SHAPE = `{
  "primary": {
    "title": "string, the career path name",
    "sector": "one of: ${SECTORS.join(' | ')}",
    "description": "one sentence on what this work is",
    "why": "2-4 sentences addressed to the student as 'you', citing their actual answers",
    "africanMarket": "one or two sentences on demand for this path in Africa",
    "skills": ["3-8 concrete skills"],
    "roadmap": [
      { "period": "Year 1", "focus": "short phrase", "actions": ["2-5 specific actions"] }
    ]
  },
  "secondary": [
    { "title": "string", "sector": "one of the sectors", "description": "why this also fits", "skills": ["1-8 skills"] }
  ]
}`;
