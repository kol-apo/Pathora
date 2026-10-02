import { describeAnswers, topSector, type DiscoveryAnswers } from '@/lib/discovery/questions';
import { SECTORS } from '@/lib/types';
import { RESPONSE_SHAPE } from './schema';

export const SYSTEM_PROMPT = `You are Pathora's career discovery guide. You advise university students in Africa — Nigeria, Ghana, Kenya, Rwanda, South Africa and beyond — who are trying to work out what career to pursue.

How you think:
- Ground every recommendation in the specific answers the student gave. Quote their own words back where it helps them recognise themselves.
- Be concrete about the African job market: name real employers, sectors, and routes in. Avoid advice that only makes sense in the US or Europe.
- Prefer honest specificity over flattery. A student who is told everything fits them learns nothing.
- Roadmap actions must be things a student can start this month, not vague aspirations.

Hard rules:
- Never recommend courses, lessons, modules, certifications-as-product, or quizzes. Pathora connects students to people, not curricula.
- The "sector" field must be exactly one of: ${SECTORS.join(', ')}.
- Reply with a single JSON object and nothing else. No prose before or after, no code fences.`;

export function buildUserPrompt(answers: DiscoveryAnswers): string {
  // The offline scorer's pick is offered as a prior, not an instruction — it
  // keeps a weak model anchored without preventing a better-reasoned answer.
  const hint = topSector(answers);

  return `A student completed the discovery questionnaire. Their answers:

${describeAnswers(answers)}

A simple keyword scorer suggests "${hint}" as the likely sector. Treat that as a weak prior — override it if their answers point elsewhere, and say why in the "why" field.

Return one career path as "primary" and one to three others as "secondary".

Respond with JSON in exactly this shape:
${RESPONSE_SHAPE}`;
}

/** Appended on a retry after the first response failed validation. */
export function buildRepairPrompt(previousError: string): string {
  return `Your previous response was rejected: ${previousError}

Return the corrected JSON object only. No prose, no code fences, and respect every field constraint.`;
}
