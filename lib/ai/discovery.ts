import type { DiscoveryAnswers } from '@/lib/discovery/questions';
import { generateMockMatch } from './providers/mock';
import { resolveProvider, type DiscoveryProvider, type ProviderEnv } from './provider';
import type { CareerMatch } from './schema';

export interface DiscoveryOutcome {
  result: CareerMatch;
  /** Provenance for DiscoveryResult — which engine actually produced this. */
  provider: string;
  model: string;
  latencyMs: number;
  /** True when the configured provider failed and the offline result was used. */
  usedFallback: boolean;
  /** Why the fallback kicked in. Log it; never show it to a student. */
  fallbackReason?: string;
}

export interface GenerateDiscoveryOptions {
  env?: ProviderEnv;
  /** Injectable for tests. Defaults to whatever `env` configures. */
  provider?: DiscoveryProvider;
  signal?: AbortSignal;
  /**
   * Disable the offline fallback and let failures propagate. Off by default:
   * a student finishing the questionnaire should always get a result.
   */
  throwOnFailure?: boolean;
}

/**
 * Run the discovery agent.
 *
 * Guarantees a usable result unless `throwOnFailure` is set. A dead API key, a
 * rate limit, a timeout, or a model that will not produce valid JSON all
 * degrade to the deterministic offline match rather than failing the request —
 * the student has just answered six questions and must not be shown an error.
 */
export async function generateDiscovery(
  answers: DiscoveryAnswers,
  options: GenerateDiscoveryOptions = {},
): Promise<DiscoveryOutcome> {
  const started = Date.now();
  const signal = options.signal ?? new AbortController().signal;

  let provider: DiscoveryProvider;
  try {
    provider = options.provider ?? resolveProvider(options.env);
  } catch (err) {
    // Misconfiguration is a deploy-time problem, not a student-facing one.
    if (options.throwOnFailure) throw err;
    return offline(answers, started, `provider config: ${(err as Error).message}`);
  }

  try {
    const result = await provider.generate(answers, signal);
    return {
      result,
      provider: provider.name,
      model: provider.model,
      latencyMs: Date.now() - started,
      usedFallback: false,
    };
  } catch (err) {
    if (options.throwOnFailure) throw err;
    return offline(
      answers,
      started,
      `${provider.name}/${provider.model}: ${(err as Error).message}`,
    );
  }
}

function offline(
  answers: DiscoveryAnswers,
  started: number,
  reason: string,
): DiscoveryOutcome {
  return {
    result: generateMockMatch(answers),
    provider: 'mock',
    model: 'rule-based-v1',
    latencyMs: Date.now() - started,
    usedFallback: true,
    fallbackReason: reason,
  };
}

/**
 * Shape a DiscoveryOutcome for persistence via the DiscoveryResult model.
 * Kept here so the storage shape and the agent stay in step.
 */
export function toDiscoveryResultDoc(
  answers: DiscoveryAnswers,
  outcome: DiscoveryOutcome,
  student: string | null = null,
) {
  return {
    student,
    answers: {
      status: answers.status,
      interests: answers.interests,
      environment: answers.environment,
      strength: answers.strength,
      vision: answers.vision,
      field: answers.field,
    },
    primary: outcome.result.primary,
    secondary: outcome.result.secondary,
    provider: outcome.provider,
    model: outcome.model,
    latencyMs: outcome.latencyMs,
  };
}
