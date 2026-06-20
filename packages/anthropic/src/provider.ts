import type { CompletionOptions, CompletionResult, LLMProvider } from '@llm-bridge/core';
import {
  LLMBridgeError,
  NetworkError,
  ProviderError,
  RetryableError,
  responseLines,
} from '@llm-bridge/core';
import { fromResponse, toRequest } from './mapping.js';

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504, 529];

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

  private resolveModel(options: CompletionOptions): string {
    const model = options.model ?? this.model;
    if (!model) throw new LLMBridgeError('No model specified');
    return model;
  }

  private async fetchChat(body: unknown): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': this.anthropicVersion,
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new NetworkError(`Could not reach Anthropic at ${this.baseUrl}: ${String(error)}`);
    }

    if (!response.ok) {
      if (RETRYABLE_STATUS_CODES.includes(response.status)) {
        throw new RetryableError(
          `Anthropic returned ${String(response.status)} ${response.statusText}`,
          response.status
        );
      }
      throw new ProviderError(
        `Anthropic returned ${String(response.status)} ${response.statusText}`,
        response.status,
      );
    }

    return response;
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const model = this.resolveModel(options);
    const response = await this.fetchChat(toRequest({ ...options, model }));

    try {
      const data: unknown = await response.json();
      return fromResponse(data);
    } catch (error) {
      throw new ProviderError(`Anthropic returned invalid JSON: ${String(error)}`, response.status);
    }
  }

  async *stream(options: CompletionOptions): AsyncIterable<string> {
    const model = this.resolveModel(options);
    const response = await this.fetchChat(toRequest({ ...options, model }, true ));

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