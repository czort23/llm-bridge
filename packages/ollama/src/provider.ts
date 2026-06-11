import type { CompletionOptions, CompletionResult, LLMProvider } from '@llm-bridge/core';
import { NetworkError, ProviderError, RetryableError } from "@llm-bridge/core";
import { fromResponse, toRequest } from "./mapping.js";

interface OllamaConfig {
    baseUrl?: string;
    apiKey?: string;
}

async function* responseLines(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (line.trim()) yield line;
        }
    }
}

export class OllamaProvider implements LLMProvider {
    private readonly baseUrl: string;
    private readonly apiKey?: string;

    constructor(config: OllamaConfig = {}) {
        this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
        this.apiKey = config.apiKey;
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
        } catch {
            throw new NetworkError(`Could not reach Ollama at ${this.baseUrl}`);
        }

        if (!response.ok) {
            if ([429, 500, 502, 503, 504].includes(response.status)) {
                throw new RetryableError('Ollama returned ' + String(response.status), response.status);
            }
            throw new ProviderError('Ollama returned ' + String(response.status), response.status);
        }

        return response;
    }

    async complete(options: CompletionOptions): Promise<CompletionResult> {
        const response = await this.fetchChat(toRequest(options));

        let data: unknown;
        try {
            data = await response.json();
        } catch {
            throw new ProviderError('Ollama returned invalid JSON', response.status);
        }

        return fromResponse(data);
    }

    async *stream(options: CompletionOptions): AsyncIterable<string> {
        const response = await this.fetchChat(toRequest(options, true));

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