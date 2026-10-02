import type { Sector } from '@/lib/types';

/**
 * The six discovery questions, in one place.
 *
 * Both the questionnaire UI and the AI prompt read from here — the prompt needs
 * the answer *text*, not the indices, and duplicating these lists would let the
 * two drift apart silently.
 *
 * `affinity` is the offline scoring signal used by the mock provider so a
 * result is still meaningful with no model available. Weights are relative
 * within a question, not absolute.
 */

export type Affinity = Partial<Record<Sector, number>>;

export interface Choice {
  label: string;
  affinity?: Affinity;
}

export const STEP_LABELS = [
  'About you',
  'Interests',
  'Work style',
  'Strengths',
  'Vision',
  'Context',
] as const;

export const TOTAL_STEPS = 6;

/** Q1 — readiness. No sector signal; it sets the tone of the explanation. */
export const STATUS_OPTIONS: Choice[] = [
  { label: "I have some ideas but I'm not sure which direction to go" },
  { label: "I'm completely lost — and that's okay, I'm here to figure it out" },
  { label: 'I know what I want but need guidance on how to get there' },
  { label: "I'm curious about my options before committing to anything" },
];

/** Q2 — interests. Multi-select. */
export const INTEREST_OPTIONS: Choice[] = [
  { label: 'Building and creating things', affinity: { Technology: 2, Creative: 1, Entrepreneurship: 1 } },
  { label: 'Working with numbers, data, and analysis', affinity: { Finance: 3, Technology: 2 } },
  { label: 'People, communication, and relationships', affinity: { Entrepreneurship: 3, Creative: 1 } },
  { label: 'Technology, systems, and how things work', affinity: { Technology: 3 } },
  { label: 'Business, markets, and strategy', affinity: { Entrepreneurship: 3, Finance: 2 } },
  { label: 'Art, design, and aesthetics', affinity: { Creative: 3 } },
  { label: 'Research, ideas, and learning', affinity: { Technology: 2, Finance: 1 } },
  { label: 'Leadership, influence, and impact', affinity: { Entrepreneurship: 3 } },
];

/** Q3 — working style. The most direct signal, so it carries the most weight. */
export const ENVIRONMENT_OPTIONS: Choice[] = [
  { label: 'I like solving problems with logic and data', affinity: { Technology: 3, Finance: 2 } },
  { label: 'I like building things people actually use', affinity: { Creative: 3, Technology: 2 } },
  { label: 'I like understanding how markets and money work', affinity: { Finance: 3, Entrepreneurship: 1 } },
  { label: 'I like leading, communicating, and persuading people', affinity: { Entrepreneurship: 3 } },
];

/** Q4 — strengths. */
export const STRENGTH_OPTIONS: Choice[] = [
  { label: 'Explaining complex things in a simple way', affinity: { Entrepreneurship: 2, Creative: 1 } },
  { label: "Figuring out why something isn't working", affinity: { Technology: 3, Finance: 1 } },
  { label: 'Coming up with creative ideas', affinity: { Creative: 3 } },
  { label: 'Getting things organised and delivered', affinity: { Entrepreneurship: 2, Finance: 2 } },
  { label: 'Reading people and situations accurately', affinity: { Entrepreneurship: 3 } },
];

/** Q5 — long-term vision. */
export const VISION_OPTIONS: Choice[] = [
  { label: 'Running my own company', affinity: { Entrepreneurship: 3 } },
  { label: 'Leading a team at a major organisation', affinity: { Entrepreneurship: 2, Finance: 1 } },
  { label: 'Being the expert everyone calls on', affinity: { Technology: 2, Finance: 2 } },
  { label: 'Creating things that exist in the world', affinity: { Creative: 3, Technology: 1 } },
  { label: 'Making systems and institutions work better', affinity: { Technology: 2, Finance: 2 } },
];

/** How much each question contributes to the offline sector score. */
export const QUESTION_WEIGHTS = {
  interests: 1,
  environment: 2,
  strength: 1.5,
  vision: 1.5,
} as const;

/** Fragments that personalise the explanation, keyed by the Q1 answer. */
export const STATUS_FRAGMENTS: string[] = [
  'you have some ideas but are still choosing a direction',
  "you're still figuring things out — which is exactly the right place to start from",
  'you know what you want and need a route to get there',
  "you're exploring your options before committing",
];

/** The raw answers a completed questionnaire produces. */
export interface DiscoveryAnswers {
  /** Index into STATUS_OPTIONS. */
  status: number;
  /** Indices into INTEREST_OPTIONS. At least one. */
  interests: number[];
  /** Index into ENVIRONMENT_OPTIONS. */
  environment: number;
  /** Index into STRENGTH_OPTIONS. */
  strength: number;
  /** Index into VISION_OPTIONS. */
  vision: number;
  /** Free text, optional. */
  field?: string;
}

const at = (list: Choice[], i: number): Choice | undefined => list[i];

/** Human-readable rendering of a set of answers, for prompts and debugging. */
export function describeAnswers(answers: DiscoveryAnswers): string {
  const interests = answers.interests
    .map((i) => at(INTEREST_OPTIONS, i)?.label)
    .filter(Boolean);

  return [
    `Current state: ${at(STATUS_OPTIONS, answers.status)?.label ?? 'unspecified'}`,
    `Interests: ${interests.length ? interests.join('; ') : 'unspecified'}`,
    `Working style: ${at(ENVIRONMENT_OPTIONS, answers.environment)?.label ?? 'unspecified'}`,
    `Strength: ${at(STRENGTH_OPTIONS, answers.strength)?.label ?? 'unspecified'}`,
    `Ten-year vision: ${at(VISION_OPTIONS, answers.vision)?.label ?? 'unspecified'}`,
    `Field of study: ${answers.field?.trim() || 'not given'}`,
  ].join('\n');
}

/**
 * Offline sector scoring across every answer.
 *
 * This exists so the mock provider — and therefore the app with no model
 * configured — still responds to all six questions rather than one.
 */
export function scoreSectors(answers: DiscoveryAnswers): Record<Sector, number> {
  const scores: Record<Sector, number> = {
    Entrepreneurship: 0,
    Technology: 0,
    Finance: 0,
    Creative: 0,
  };

  const apply = (choice: Choice | undefined, weight: number) => {
    if (!choice?.affinity) return;
    for (const [sector, value] of Object.entries(choice.affinity)) {
      scores[sector as Sector] += (value ?? 0) * weight;
    }
  };

  for (const i of answers.interests) apply(at(INTEREST_OPTIONS, i), QUESTION_WEIGHTS.interests);
  apply(at(ENVIRONMENT_OPTIONS, answers.environment), QUESTION_WEIGHTS.environment);
  apply(at(STRENGTH_OPTIONS, answers.strength), QUESTION_WEIGHTS.strength);
  apply(at(VISION_OPTIONS, answers.vision), QUESTION_WEIGHTS.vision);

  return scores;
}

/** Highest-scoring sector. Ties break in a fixed order, so results are stable. */
export function topSector(answers: DiscoveryAnswers): Sector {
  const scores = scoreSectors(answers);
  const order: Sector[] = ['Technology', 'Creative', 'Finance', 'Entrepreneurship'];
  return order.reduce((best, s) => (scores[s] > scores[best] ? s : best), order[0]);
}
