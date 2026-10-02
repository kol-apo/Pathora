import {
  INTEREST_OPTIONS,
  STATUS_FRAGMENTS,
  topSector,
  type DiscoveryAnswers,
} from '@/lib/discovery/questions';
import { careerProfiles } from '@/lib/data';
import type { Sector } from '@/lib/types';
import type { DiscoveryProvider } from '../provider';
import { CareerMatchSchema, type CareerMatch } from '../schema';

/**
 * The offline provider.
 *
 * This is not a stub — it is what runs when no model is configured, when a key
 * is missing, and when a live provider fails. So it scores all six answers
 * rather than keying off one, and composes its explanation from what the
 * student actually said.
 *
 * Deterministic: identical answers always produce an identical result.
 */

/** Base copy per sector, drawn from the curated profiles. */
const profileBySector = new Map<Sector, (typeof careerProfiles)[number]>(
  careerProfiles.map((p) => [p.primary.sector, p]),
);

function composeWhy(answers: DiscoveryAnswers, baseWhy: string): string {
  const interests = answers.interests
    .slice(0, 3)
    .map((i) => INTEREST_OPTIONS[i]?.label.toLowerCase())
    .filter(Boolean);

  const opening = `You told us ${
    STATUS_FRAGMENTS[answers.status] ?? 'you are still working things out'
  }, and that you are drawn to ${interests.length ? interests.join(', ') : 'new challenges'}.`;

  const context = answers.field?.trim()
    ? ` With your background in ${answers.field.trim()}, this path builds on what you already know.`
    : '';

  return `${opening}${context} ${baseWhy}`;
}

export function generateMockMatch(answers: DiscoveryAnswers): CareerMatch {
  const sector = topSector(answers);
  const profile = profileBySector.get(sector) ?? careerProfiles[0];

  const result: CareerMatch = {
    primary: {
      title: profile.primary.title,
      sector: profile.primary.sector,
      description: profile.primary.description,
      why: composeWhy(answers, profile.primary.why),
      africanMarket: profile.primary.africanMarket,
      skills: profile.primary.skills,
      roadmap: profile.primary.roadmap.map((phase) => ({
        period: phase.period,
        focus: phase.focus,
        actions: phase.actions,
      })),
    },
    secondary: profile.secondary.map((s) => ({
      title: s.title,
      sector: s.sector,
      description: s.description,
      skills: s.skills,
    })),
  };

  // Validate our own output too — the curated copy has to satisfy the same
  // contract the models are held to, or the fallback could fail where a live
  // provider succeeded.
  return CareerMatchSchema.parse(result);
}

export function createMockProvider(): DiscoveryProvider {
  return {
    name: 'mock',
    model: 'rule-based-v1',
    async generate(answers: DiscoveryAnswers): Promise<CareerMatch> {
      return generateMockMatch(answers);
    },
  };
}
