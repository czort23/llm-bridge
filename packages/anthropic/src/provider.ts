import type { CompletionOptions, CompletionResult, LLMProvider } from '@omnillm/core';
import {
  ProviderError,
  httpPost,
  resolveModel,
  responseLines,
  DEFAULT_RETRYABLE_STATUS_CODES,
} from '@omnillm/core';
import { fromResponse, toRequest } from './mapping.js';

interface AnthropicConfig {
  baseUrl?: string;
  apiKey: string;
  model?: string;
  anthropicVersion?: string;
}

export class AnthropicProvider implements LLMProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model?: string;
  private readonly anthropicVersion: string;

  constructor(config: AnthropicConfig) {
    this.baseUrl = config.baseUrl ?? 'https://api.anthropic.com/v1';
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.anthropicVersion = config.anthropicVersion ?? '2023-06-01';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'anthropic-version': this.anthropicVersion,
      'x-api-key': this.apiKey,
    };
  }

  private async fetchChat(options: CompletionOptions, stream: boolean = false): Promise<Response> {
    const url = `${this.baseUrl}/messages`;
    const model = resolveModel(options.model, this.model);

    return await httpPost(url, {
      headers: this.headers(),
      body: toRequest({ ...options, model }, stream),
      retryableCodes: [...DEFAULT_RETRYABLE_STATUS_CODES, 529],
      providerName: 'Anthropic',
    });
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const response = await this.fetchChat(options);

    try {
      const data: unknown = await response.json();
      return fromResponse(data);
    } catch (error) {
      throw new ProviderError(`Anthropic returned invalid JSON: ${String(error)}`, response.status);
    }
  }

  async *stream(options: CompletionOptions): AsyncIterable<string> {
    const response = await this.fetchChat(options, true);

    if (!response.body) {
      throw new ProviderError('Anthropic returned empty response body', response.status);
    }

    for await (const line of responseLines(response.body)) {
      if (!line.startsWith('data: ')) continue;
      const chunk = JSON.parse(line.slice(6)) as { type: string; delta?: { text?: string } };
      if (chunk.type === 'message_stop') break;
      if (chunk.type !== 'content_block_delta') continue;
      yield chunk.delta?.text ?? '';
    }
  }
}
