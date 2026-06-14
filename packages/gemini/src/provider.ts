import type { CompletionOptions, CompletionResult, LLMProvider } from '@llm-bridge/core';
import { LLMBridgeError, NetworkError, ProviderError, RetryableError, responseLines } from "@llm-bridge/core";
import { fromResponse, toRequest } from "./mapping.js";

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

interface GeminiConfig {
    baseUrl?: string;
    apiKey: string;
    model?: string;
}

export class GeminiProvider implements LLMProvider {
    private readonly baseUrl: string;
    private readonly apiKey: string
    private readonly model?: string

    constructor(config: GeminiConfig) {
        this.baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1';
        this.apiKey = config.apiKey;
        this.model = config.model;
    }

    private resolveModel(options: CompletionOptions): string {
        const model = options.model ?? this.model;
        if (!model) throw new LLMBridgeError('No model specified');
        return model;
    }

    private async fetchChat(url: string, body:unknown): Promise<Response> {
        let response: Response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey,
                },
                body: JSON.stringify(body),
            });
        } catch (error) {
            throw new NetworkError(`Could not reach Gemini at ${this.baseUrl}: ${String(error)}`);
        }

        if (!response.ok) {
            if (RETRYABLE_STATUS_CODES.includes(response.status)) {
                throw new RetryableError(`Gemini returned ${String(response.status)} ${response.statusText}`, response.status);
            }
            throw new ProviderError(`Gemini returned ${String(response.status)} ${response.statusText}`, response.status);
        }

        return response;
    }

    async complete(options: CompletionOptions): Promise<CompletionResult> {
        const model = this.resolveModel(options);
        const url = `${this.baseUrl}/models/${model}:generateContent`;
        const response = await this.fetchChat(url, toRequest(options));

        try {
            const data: unknown = await response.json();
            return fromResponse(data, model);
        } catch (error) {
            throw new ProviderError(`Gemini returned invalid JSON: ${String(error)}`, response.status);
        }
    }

    async *stream(options: CompletionOptions): AsyncIterable<string> {
        const model = this.resolveModel(options);
        const url = `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse`;
        const response = await this.fetchChat(url, toRequest(options));

        if (!response.body) {
            throw new ProviderError('Gemini returned empty response body', response.status);
        }

        for await (const line of responseLines(response.body)) {
            if (!line.startsWith('data: ')) continue;
            const chunk = JSON.parse(line.slice(6)) as { candidates: { content: { parts: { text: string }[] } }[] };
            yield chunk.candidates[0]?.content.parts[0]?.text ?? '';
        }
    }
}