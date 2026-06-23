import type { CompletionOptions, CompletionResult, LLMProvider } from '@omnillm/core';
import {
  ProviderError,
  httpPost,
  resolveModel,
  responseLines,
  DEFAULT_RETRYABLE_STATUS_CODES,
} from '@omnillm/core';
import { fromResponse, toRequest } from './mapping.js';

interface OllamaConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export class OllamaProvider implements LLMProvider {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly model?: string;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private async fetchChat(options: CompletionOptions, stream: boolean = false): Promise<Response> {
    const url = `${this.baseUrl}/api/chat`;
    const model = resolveModel(options.model, this.model);

    return await httpPost(url, {
      headers: this.headers(),
      body: toRequest({ ...options, model }, stream),
      retryableCodes: DEFAULT_RETRYABLE_STATUS_CODES,
      providerName: 'Ollama',
    });
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const response = await this.fetchChat(options);

    try {
      const data: unknown = await response.json();
      return fromResponse(data);
    } catch (error) {
      throw new ProviderError(`Ollama returned invalid JSON: ${String(error)}`, response.status);
    }
  }

  async *stream(options: CompletionOptions): AsyncIterable<string> {
    const response = await this.fetchChat(options, true);

    if (!response.body) {
      throw new ProviderError('Ollama returned empty response body', response.status);
    }

    for await (const line of responseLines(response.body)) {
      const chunk = JSON.parse(line) as { message: { content?: string }; done: boolean };
      yield chunk.message.content ?? '';
      if (chunk.done) break;
    }
  }
}
