import type { CompletionOptions, CompletionResult, LLMProvider } from '@llm-bridge/core';
import {
  LLMBridgeError,
  NetworkError,
  ProviderError,
  RetryableError,
  responseLines,
} from '@llm-bridge/core';
import { fromResponse, toRequest } from './mapping.js';

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

interface OpenAIConfig {
  baseUrl?: string;
  apiKey: string;
  model?: string;
}

export class OpenAIProvider implements LLMProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model?: string;

  constructor(config: OpenAIConfig) {
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  private resolveModel(options: CompletionOptions): string {
    const model = options.model ?? this.model;
    if (!model) throw new LLMBridgeError('No model specified');
    return model;
  }

  private async fetchChat(body: unknown): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new NetworkError(`Could not reach OpenAI at ${this.baseUrl}: ${String(error)}`);
    }

    if (!response.ok) {
      if (RETRYABLE_STATUS_CODES.includes(response.status)) {
        throw new RetryableError(
          `OpenAI returned ${String(response.status)} ${response.statusText}`,
          response.status,
        );
      }
      throw new ProviderError(
        `OpenAI returned ${String(response.status)} ${response.statusText}`,
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
      throw new ProviderError(`OpenAI returned invalid JSON: ${String(error)}`, response.status);
    }
  }

  async *stream(options: CompletionOptions): AsyncIterable<string> {
    const model = this.resolveModel(options);
    const response = await this.fetchChat(toRequest({ ...options, model }, true));

    if (!response.body) {
      throw new ProviderError('OpenAI returned empty response body', response.status);
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
