import type { DiscoveryAnswers } from '@/lib/discovery/questions';
import type { CareerMatch } from './schema';

/**
 * The seam between Pathora and whichever model produces career matches.
 *
 * Everything above this line is provider-agnostic. Changing model — or vendor —
 * is a change of environment variables, not of application code.
 */
export interface DiscoveryProvider {
  /** Recorded on DiscoveryResult for provenance. */
  readonly name: string;
  readonly model: string;
  generate(answers: DiscoveryAnswers, signal: AbortSignal): Promise<CareerMatch>;
}

export interface ProviderEnv {
  AI_PROVIDER?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  AI_API_KEY?: string;
  AI_TIMEOUT_MS?: string;
  AI_JSON_MODE?: string;
  /** Present so `process.env` is directly assignable. */
  [key: string]: string | undefined;
}

export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderConfigError';
  }
}

/**
 * Build the configured provider.
 *
 * Defaults to `mock`, so a fresh checkout with no `.env.local` still runs the
 * discovery flow end to end.
 */
export function resolveProvider(env: ProviderEnv = process.env): DiscoveryProvider {
  const kind = (env.AI_PROVIDER ?? 'mock').trim().toLowerCase();

  // Imported lazily so the mock path never pulls in the HTTP adapter, and vice
  // versa — keeps this resolvable in environments without fetch configured.
  if (kind === 'mock' || kind === '') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createMockProvider } = require('./providers/mock') as typeof import('./providers/mock');
    return createMockProvider();
  }

  if (kind === 'openai-compatible') {
    const missing = (['AI_BASE_URL', 'AI_MODEL', 'AI_API_KEY'] as const).filter(
      (k) => !env[k]?.trim(),
    );
    if (missing.length) {
      throw new ProviderConfigError(
        `AI_PROVIDER="openai-compatible" requires ${missing.join(', ')}. ` +
          'Set them in .env.local, or use AI_PROVIDER="mock".',
      );
    }

    const timeout = Number(env.AI_TIMEOUT_MS);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createOpenAICompatibleProvider } =
      require('./providers/openaiCompatible') as typeof import('./providers/openaiCompatible');

    return createOpenAICompatibleProvider({
      baseUrl: env.AI_BASE_URL!.trim(),
      apiKey: env.AI_API_KEY!.trim(),
      model: env.AI_MODEL!.trim(),
      name: hostLabel(env.AI_BASE_URL!),
      timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : undefined,
      jsonMode: env.AI_JSON_MODE !== 'false',
    });
  }

  throw new ProviderConfigError(
    `Unknown AI_PROVIDER "${kind}". Supported: "mock", "openai-compatible".`,
  );
}

/** "https://api.groq.com/openai/v1" -> "api.groq.com", for readable provenance. */
function hostLabel(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return 'openai-compatible';
  }
}
