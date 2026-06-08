import type { CompletionOptions, CompletionResult } from "@llm-bridge/core";

export function toOllamaRequest(options: CompletionOptions) {
    return {
        model: options.model,
        messages: options.messages,
        options: {
            temperature: options.temperature,
            num_predict: options.maxTokens,
        },
        stream: false,
    }
}

interface OllamaResponse {
    message: {
        content: string,
    },
    model: string,
    prompt_eval_count: number,
    eval_count: number,
}

export function fromOllamaResponse(data: unknown): CompletionResult {
    const response = data as OllamaResponse;
    return {
        content: response.message.content,
        model: response.model,
        provider: 'ollama',
        usage: {
            inputTokens: response.prompt_eval_count,
            outputTokens: response.eval_count,
        }
    }
}