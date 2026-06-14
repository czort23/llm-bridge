import type { CompletionOptions, CompletionResult } from "@llm-bridge/core";
import { LLMBridgeError } from "@llm-bridge/core";

interface GroqResponse {
    choices: {
        message: {
            content: string,
        }
    }[],
    model: string,
    usage: {
        prompt_tokens: number,
        completion_tokens: number,
    },
}

export function toRequest(options: CompletionOptions, stream: boolean = false) {
    return {
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        max_completion_tokens: options.maxTokens,
        stream: stream,
    }
}

export function fromResponse(data: unknown): CompletionResult {
    const response = data as GroqResponse;
    const text = response.choices[0]?.message.content;
    if (text === undefined) {
        throw new LLMBridgeError('Groq returned no content (possibly blocked or empty response)');
    }

    return {
        content: text,
        model: response.model,
        provider: 'groq',
        usage: {
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
        }
    }
}