import type { CompletionOptions, CompletionResult } from "@llm-bridge/core";

interface OllamaResponse {
    message: {
        content: string,
    },
    model: string,
    prompt_eval_count: number,
    eval_count: number,
}

export function toRequest(options: CompletionOptions, stream: boolean = false) {
    return {
        model: options.model,
        messages: options.messages,
        options: {
            temperature: options.temperature,
            num_predict: options.maxTokens,
        },
        stream: stream,
    }
}

export function fromResponse(data: unknown): CompletionResult {
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