import type { CompletionOptions, CompletionResult, LLMProvider } from '@llm-bridge/core';
import { NetworkError, ProviderError, RetryableError } from "@llm-bridge/core";
import { fromResponse, toRequest } from "./mapping.js";

interface GeminiConfig {
    baseUrl?: string;
    apiKey: string;
}

export class GeminiProvider implements LLMProvider {
    private readonly baseUrl: string;
    private readonly apiKey: string

    constructor(config: GeminiConfig) {
        this.baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1';
        this.apiKey = config.apiKey;
    }

    async complete(options: CompletionOptions): Promise<CompletionResult> {
        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}/models/${options.model}:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey,
                },
                body: JSON.stringify(toRequest(options)),
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

        let data: unknown;
        try {
            data = await response.json();
        } catch {
            throw new ProviderError('Gemini returned invalid JSON', response.status);
        }

        return fromResponse(data, options.model);
    }
}