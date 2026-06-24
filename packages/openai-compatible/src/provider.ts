import type { CompletionOptions, CompletionResult, LLMProvider } from '@omnillm/core';
import {
  ProviderError,
  httpPost,
  resolveModel,
  responseLines,
  DEFAULT_RETRYABLE_STATUS_CODES,
} from '@omnillm/core';
import { fromResponse, toRequest } from './mapping.js';

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model?: string;
  providerName: string;
}

export class OpenAICompatibleProvider implements LLMProvider {
  protected readonly baseUrl: string;
  protected readonly apiKey: string;
  protected readonly model?: string;
  protected readonly providerName: string;

  constructor(config: OpenAICompatibleConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.providerName = config.providerName;
  }

  protected headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  protected get retryableCodes(): readonly number[] {
    return DEFAULT_RETRYABLE_STATUS_CODES;
  }

  private async fetchChat(options: CompletionOptions, stream: boolean = false): Promise<Response> {
    const url = `${this.baseUrl}/chat/completions`;
    const model = resolveModel(options.model, this.model);

    return await httpPost(url, {
      headers: this.headers(),
      body: toRequest({ ...options, model }, stream),
      retryableCodes: this.retryableCodes,
      providerName: this.providerName,
    });
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const response = await this.fetchChat(options);

    try {
      const data: unknown = await response.json();
      return fromResponse(data, this.providerName);
    } catch (error) {
      throw new ProviderError(
        `${this.providerName} returned invalid JSON: ${String(error)}`,
        response.status,
      );
    }
  }

  async *stream(options: CompletionOptions): AsyncIterable<string> {
    const response = await this.fetchChat(options, true);

    if (!response.body) {
      throw new ProviderError(`${this.providerName} returned empty response body`, response.status);
    }

    for await (const line of responseLines(response.body)) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') break;
      const chunk = JSON.parse(data) as { choices: { delta: { content?: string } }[] };
      yield chunk.choices[0]?.delta.content ?? '';
    }
  }
}
