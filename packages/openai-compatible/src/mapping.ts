import type { CompletionOptions, CompletionResult } from '@llm-bridge/core';
import { LLMBridgeError } from '@llm-bridge/core';

interface OpenAICompatibleResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export function toRequest(options: CompletionOptions, stream: boolean = false) {
  return {
    messages: options.messages,
    model: options.model,
    max_completion_tokens: options.maxTokens,
    temperature: options.temperature,
    stream: stream,
  };
}

export function fromResponse(data: unknown, providerName: string): CompletionResult {
  const response = data as OpenAICompatibleResponse;
  const text = response.choices[0]?.message.content;
  if (text === undefined) {
    throw new LLMBridgeError(`${providerName} returned no content (possibly blocked or empty response)`);
  }

  return {
    content: text,
    model: response.model,
    provider: providerName.toLowerCase(),
    usage: {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
    },
  };
}
