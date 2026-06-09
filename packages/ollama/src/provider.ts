import type { CompletionOptions, CompletionResult, LLMProvider } from '@llm-bridge/core';
import { NetworkError, ProviderError, RetryableError } from "@llm-bridge/core";
import { fromOllamaResponse, toOllamaRequest } from "./mapping.js";

interface OllamaConfig {
    baseUrl?: string;
    apiKey?: string;
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

    async complete(options: CompletionOptions): Promise<CompletionResult> {
        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: this.headers(),
                body: JSON.stringify(toOllamaRequest(options)),
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

        let data: unknown;
        try {
            data = await response.json();
        } catch {
            throw new ProviderError('Ollama returned invalid JSON', response.status);
        }

        return fromOllamaResponse(data);
    }
}