import type { CompletionOptions, CompletionResult, LLMProvider } from '@llm-bridge/core';
import { NetworkError, ProviderError, RetryableError } from "@llm-bridge/core";
import { fromOllamaResponse, toOllamaRequest } from "./mapping.js";

interface OllamaProviderOptions {
    endpoint?: string;
}

export class OllamaProvider implements LLMProvider {
    private readonly endpoint: string;

    constructor(options: OllamaProviderOptions = {}) {
        this.endpoint = options.endpoint ?? 'http://localhost:11434/api/chat';
    }

    async complete(options: CompletionOptions): Promise<CompletionResult> {
        let response: Response;
        try {
            response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {'Content-Type': 'application/json',},
                body: JSON.stringify(toOllamaRequest(options)),
            });
        } catch {
            throw new NetworkError(`Could not reach Ollama at ${this.endpoint}`);
        }

        if (!response.ok) {
            if (response.status === 429
                || response.status === 500
                || response.status === 502
                || response.status === 503
                || response.status === 504
            ) {
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