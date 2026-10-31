import type { DiscoveryAnswers } from '@/lib/discovery/questions';
import type { CareerMatch } from './schema';
import { createMockProvider } from './providers/mock';
import { createOpenAICompatibleComplete, createOpenAICompatibleProvider } from './providers/openaiCompatible';
import type { CompleteFn } from './providers/llm';

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
  generate(answers: DiscoveryAnswers, signal: AbortSignal): Promise<Generated>;
}

/** A valid result, and how many times the model had to be asked again to get it. */
export interface Generated {
  result: CareerMatch;
  retryCount: number;
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

  if (kind === 'mock' || kind === '') {
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

/** A plain-text chat model: who it is, and the call that returns its reply. */
export interface ChatModel {
  name: string;
  model: string;
  complete: CompleteFn;
}

/**
 * The configured model for free-text chat (Pathy), or null when none is
 * configured: the offline matcher cannot hold a conversation.
 */
export function resolveChatModel(env: ProviderEnv = process.env): ChatModel | null {
  if ((env.AI_PROVIDER ?? 'mock').trim().toLowerCase() !== 'openai-compatible') return null;
  if (!env.AI_BASE_URL?.trim() || !env.AI_MODEL?.trim() || !env.AI_API_KEY?.trim()) return null;

  const timeout = Number(env.AI_TIMEOUT_MS);
  return {
    name: hostLabel(env.AI_BASE_URL),
    model: env.AI_MODEL.trim(),
    complete: createOpenAICompatibleComplete({
      baseUrl: env.AI_BASE_URL.trim(),
      apiKey: env.AI_API_KEY.trim(),
      model: env.AI_MODEL.trim(),
      name: hostLabel(env.AI_BASE_URL),
      timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : undefined,
      temperature: 0.5,
      // A conversation, not a JSON object.
      jsonMode: false,
    }),
  };
}
