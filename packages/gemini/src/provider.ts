import type { CompletionOptions, CompletionResult, LLMProvider } from '@llm-bridge/core';
import { NetworkError, ProviderError, RetryableError } from "@llm-bridge/core";
import { fromResponse, toRequest } from "./mapping.js";

interface GeminiConfig {
    baseUrl?: string;
    apiKey: string;
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

export class GeminiProvider implements LLMProvider {
    private readonly baseUrl: string;
    private readonly apiKey: string

    constructor(config: GeminiConfig) {
        this.baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1';
        this.apiKey = config.apiKey;
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
        } catch {
            throw new NetworkError(`Could not reach Gemini at ${this.baseUrl}`);
        }

        if (!response.ok) {
            if ([429, 500, 502, 503, 504].includes(response.status)) {
                throw new RetryableError('Gemini returned ' + String(response.status), response.status);
            }
            throw new ProviderError('Gemini returned ' + String(response.status), response.status);
        }

        return response;
    }

    async complete(options: CompletionOptions): Promise<CompletionResult> {
        const url = `${this.baseUrl}/models/${options.model}:generateContent`;
        const response = await this.fetchChat(url, toRequest(options));

        let data: unknown;
        try {
            data = await response.json();
        } catch {
            throw new ProviderError('Gemini returned invalid JSON', response.status);
        }

        return fromResponse(data, options.model);
    }

    async *stream(options: CompletionOptions): AsyncIterable<string> {
        const url = `${this.baseUrl}/models/${options.model}:streamGenerateContent?alt=sse`;
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