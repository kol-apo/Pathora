import type { DiscoveryProvider } from '../provider';
import { createLlmProvider, type ChatMessage } from './llm';

/**
 * Adapter for any service exposing the OpenAI `/chat/completions` shape.
 *
 * That is deliberately most of the cheap market — Groq, OpenRouter, Mistral,
 * DeepSeek, Together, a local Ollama, Google Gemini via its OpenAI-compatible
 * endpoint, and OpenAI itself. Switching between them is a change of base URL,
 * model name, and key, with no code change.
 */

export interface OpenAICompatibleConfig {
  /** Base URL up to but excluding /chat/completions. */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Label recorded on the result for provenance. */
  name?: string;
  timeoutMs?: number;
  temperature?: number;
  /**
   * Send `response_format: { type: "json_object" }`. Most services support it;
   * a few reject the field outright, so it can be switched off.
   */
  jsonMode?: boolean;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export function createOpenAICompatibleProvider(
  config: OpenAICompatibleConfig,
): DiscoveryProvider {
  const {
    baseUrl,
    apiKey,
    model,
    name = 'openai-compatible',
    timeoutMs = 30_000,
    temperature = 0.7,
    jsonMode = true,
  } = config;

  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  const complete = async (messages: ChatMessage[], outerSignal: AbortSignal): Promise<string> => {
    // Abort on either the caller's signal or our own timeout. Done by hand
    // rather than with AbortSignal.any(), which is not available on every
    // Node version this may run on.
    const controller = new AbortController();
    const onOuterAbort = () => controller.abort(outerSignal.reason);
    const timer = setTimeout(
      () => controller.abort(new Error(`${name} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    if (outerSignal.aborted) onOuterAbort();
    else outerSignal.addEventListener('abort', onOuterAbort, { once: true });

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${name} returned HTTP ${res.status}: ${body.slice(0, 400)}`);
      }

      const data = (await res.json()) as ChatCompletionResponse;
      if (data.error?.message) {
        throw new Error(`${name} error: ${data.error.message}`);
      }

      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim() === '') {
        throw new Error(`${name} returned an empty completion.`);
      }
      return content;
    } finally {
      clearTimeout(timer);
      outerSignal.removeEventListener('abort', onOuterAbort);
    }
  };

  return createLlmProvider({ name, model, complete });
}
