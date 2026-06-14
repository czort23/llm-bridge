import type { CompletionOptions, CompletionResult, LLMProvider } from "@llm-bridge/core";
import { LLMBridgeError, NetworkError, ProviderError, RetryableError, responseLines } from "@llm-bridge/core";
import { fromResponse, toRequest } from "./mapping.js";

interface GroqConfig {
    baseUrl?: string;
    apiKey: string;
    model?: string;
}

export class GroqProvider implements LLMProvider {
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly model?: string;

    constructor(config: GroqConfig) {
        this.baseUrl = config.baseUrl ?? 'https://api.groq.com/openai/v1';
        this.apiKey = config.apiKey;
        this.model = config.model;
    }

    private async fetchChat(body: unknown): Promise<Response> {
        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.apiKey,
                },
                body: JSON.stringify(body),
            });
        } catch {
            throw new NetworkError(`Could not reach Groq at ${this.baseUrl}`);
        }

        if (!response.ok) {
            if ([429, 500, 502, 503, 504].includes(response.status)) {
                throw new RetryableError('Groq returned ' + String(response.status), response.status);
            }
            throw new ProviderError('Groq returned ' + String(response.status), response.status);
        }

        return response;
    }

    async complete(options: CompletionOptions): Promise<CompletionResult> {
        const model = options.model ?? this.model;
        if (!model) throw new LLMBridgeError('No model specified');

        const response = await this.fetchChat(toRequest({ ...options, model }));

        try {
            const data: unknown = await response.json();
            return fromResponse(data);
        } catch {
            throw new ProviderError('Groq returned invalid JSON', response.status);
        }
    }

    async *stream(options: CompletionOptions): AsyncIterable<string> {
        const model = options.model ?? this.model;
        if (!model) throw new LLMBridgeError('No model specified');

        const response = await this.fetchChat(toRequest({ ...options, model }, true));

        if (!response.body) {
            throw new ProviderError('Groq returned empty response body', response.status);
        }

        for await (const line of responseLines(response.body)) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') break;
            const chunk = JSON.parse(data) as { choices: { delta: { content?: string; } }[] };
            yield chunk.choices[0]?.delta.content ?? '';
        }
    }
}