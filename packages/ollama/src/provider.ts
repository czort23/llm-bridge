import type { CompletionOptions, CompletionResult, LLMProvider } from '@llm-bridge/core';
import { LLMBridgeError, NetworkError, ProviderError, RetryableError, responseLines } from "@llm-bridge/core";
import { fromResponse, toRequest } from "./mapping.js";

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

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

    private resolveModel(options: CompletionOptions): string {
        const model = options.model ?? this.model;
        if (!model) throw new LLMBridgeError('No model specified');
        return model;
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

    private async fetchChat(body: unknown): Promise<Response> {
        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: this.headers(),
                body: JSON.stringify(body),
            });
        } catch (error) {
            throw new NetworkError(`Could not reach Ollama at ${this.baseUrl}: ${String(error)}`);
        }

        if (!response.ok) {
            if (RETRYABLE_STATUS_CODES.includes(response.status)) {
                throw new RetryableError(`Ollama returned ${String(response.status)} ${response.statusText}`, response.status);
            }
            throw new ProviderError(`Ollama returned ${String(response.status)} ${response.statusText}`, response.status);
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
            throw new ProviderError(`Ollama returned invalid JSON: ${String(error)}`, response.status);
        }
    }

    async *stream(options: CompletionOptions): AsyncIterable<string> {
        const model = this.resolveModel(options);
        const response = await this.fetchChat(toRequest({ ...options, model }, true));

        if (!response.body) {
            throw new ProviderError('Ollama returned empty response body', response.status);
        }

        for await (const line of responseLines(response.body)) {
            const chunk = JSON.parse(line) as { message: { content: string }; done: boolean };
            yield chunk.message.content;
            if (chunk.done) break;
        }
    }
}