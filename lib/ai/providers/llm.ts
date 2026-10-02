import type { DiscoveryAnswers } from '@/lib/discovery/questions';
import { buildRepairPrompt, buildUserPrompt, SYSTEM_PROMPT } from '../prompt';
import { parseCareerMatch, type CareerMatch } from '../schema';
import type { DiscoveryProvider } from '../provider';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Raw text completion. The only thing a new backend has to implement. */
export type CompleteFn = (messages: ChatMessage[], signal: AbortSignal) => Promise<string>;

export interface LlmProviderConfig {
  name: string;
  model: string;
  complete: CompleteFn;
  /** Attempts in total, including the first. One retry by default. */
  maxAttempts?: number;
}

export class ModelOutputError extends Error {
  constructor(
    message: string,
    readonly attempts: string[],
  ) {
    super(message);
    this.name = 'ModelOutputError';
  }
}

/**
 * Turns a raw text-completion function into a discovery provider: builds the
 * prompt, validates the reply, and on a schema failure feeds the error back to
 * the model once so it can repair its own output.
 *
 * Shared across every LLM backend so retry behaviour cannot drift between them.
 */
export function createLlmProvider(config: LlmProviderConfig): DiscoveryProvider {
  const maxAttempts = config.maxAttempts ?? 2;

  return {
    name: config.name,
    model: config.model,

    async generate(answers: DiscoveryAnswers, signal: AbortSignal): Promise<CareerMatch> {
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(answers) },
      ];

      const failures: string[] = [];

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const text = await config.complete(messages, signal);
        const parsed = parseCareerMatch(text);

        if (parsed.ok) return parsed.value;

        failures.push(`attempt ${attempt}: ${parsed.error}`);

        // Show the model its own bad output plus the reason, so the retry is
        // a correction rather than a blind re-roll.
        messages.push({ role: 'assistant', content: text.slice(0, 4000) });
        messages.push({ role: 'user', content: buildRepairPrompt(parsed.error) });
      }

      throw new ModelOutputError(
        `${config.name}/${config.model} produced no valid result in ${maxAttempts} attempts.`,
        failures,
      );
    },
  };
}
