import type { CompletionOptions, CompletionResult } from "@llm-bridge/core";
import { LLMBridgeError } from "@llm-bridge/core";

interface GeminiPart {
    text: string;
}

interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
}

interface GeminiResponse {
    candidates: {
        content: {
            parts: { text: string }[];
        };
    }[];
    usageMetadata: {
        promptTokenCount: number,
        candidatesTokenCount: number,
    }
}

export function toRequest(options: CompletionOptions) {
    const contents: GeminiContent[] = [];
    const systemInstruction: { parts: GeminiPart[] } = { parts: [] };

    for (const message of options.messages) {
        if (message.role === 'system') {
            systemInstruction.parts.push({ text: message.content });
            continue;
        }

        contents.push({
            role: message.role === 'user' ? 'user' : 'model',
            parts: [{ text: message.content }],
        });
    }

    return {
        contents,
        ...(systemInstruction.parts.length > 0 && { systemInstruction }),
        generationConfig: {
            temperature: options.temperature,
            maxOutputTokens: options.maxTokens,
        }
    }
}

export function fromResponse(data: unknown, model: string): CompletionResult {
    const response = data as GeminiResponse;

    const text = response.candidates[0]?.content.parts[0]?.text;

    if (text === undefined) {
        throw new LLMBridgeError('Gemini returned no content (possibly blocked or empty response)');
    }

    return {
        content: text,
        model,
        provider: 'gemini',
        usage: {
            inputTokens: response.usageMetadata.promptTokenCount,
            outputTokens: response.usageMetadata.candidatesTokenCount,
        }
    }
}