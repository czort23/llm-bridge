import type { CompletionOptions, CompletionResult } from '@llm-bridge/core';
import { LLMBridgeError } from '@llm-bridge/core';

interface OpenAIResponse {
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

export function fromResponse(data: unknown): CompletionResult {
  const response = data as OpenAIResponse;
  const text = response.choices[0]?.message.content;
  if (text === undefined) {
    throw new LLMBridgeError('OpenAI returned no content (possibly blocked or empty response)');
  }

  return {
    content: text,
    model: response.model,
    provider: 'openai',
    usage: {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
    },
  };
}
