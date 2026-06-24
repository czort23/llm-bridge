import type { CompletionOptions, CompletionResult, LLMProvider } from '@omnillm/core';
import {
  ProviderError,
  httpPost,
  resolveModel,
  responseLines,
  DEFAULT_RETRYABLE_STATUS_CODES,
} from '@omnillm/core';
import { fromResponse, toRequest } from './mapping.js';

interface GeminiConfig {
  baseUrl?: string;
  apiKey: string;
  model?: string;
}

export class GeminiProvider implements LLMProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model?: string;

  constructor(config: GeminiConfig) {
    this.baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1';
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-goog-api-key': this.apiKey,
    };
  }

  private async fetchChat(
    model: string,
    options: CompletionOptions,
    stream: boolean = false,
  ): Promise<Response> {
    const url = stream
      ? `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse`
      : `${this.baseUrl}/models/${model}:generateContent`;

    return await httpPost(url, {
      headers: this.headers(),
      body: toRequest(options),
      retryableCodes: DEFAULT_RETRYABLE_STATUS_CODES,
      providerName: 'Gemini',
    });
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const model = resolveModel(options.model, this.model);
    const response = await this.fetchChat(model, options);

    try {
      const data: unknown = await response.json();
      return fromResponse(data, model);
    } catch (error) {
      throw new ProviderError(`Gemini returned invalid JSON: ${String(error)}`, response.status);
    }
  }

  async *stream(options: CompletionOptions): AsyncIterable<string> {
    const model = resolveModel(options.model, this.model);
    const response = await this.fetchChat(model, options, true);

    if (!response.body) {
      throw new ProviderError('Gemini returned empty response body', response.status);
    }

    for await (const line of responseLines(response.body)) {
      if (!line.startsWith('data: ')) continue;
      const chunk = JSON.parse(line.slice(6)) as {
        candidates: { content: { parts: { text: string }[] } }[];
      };
      yield chunk.candidates[0]?.content.parts[0]?.text ?? '';
    }
  }
}
