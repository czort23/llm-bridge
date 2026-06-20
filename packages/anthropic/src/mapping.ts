import type { CompletionOptions, CompletionResult } from '@llm-bridge/core';
import { LLMBridgeError } from '@llm-bridge/core';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: {
    type: string;
    text?: string;
  }[];
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export function toRequest(options: CompletionOptions, stream: boolean = false) {
  const messages: AnthropicMessage[] = [];
  const system: { text: string, type: 'text' }[] = [];

  for (const message of options.messages) {
    if (message.role === 'system') {
      system.push({ text: message.content, type: 'text' });
      continue;
    }

    messages.push({ role: message.role, content: message.content });
  }

  return {
    model: options.model,
    messages: messages,
    ...(system.length > 0 && { system }),
    temperature: options.temperature,
    max_tokens: options.maxTokens ?? 4096,
    stream: stream,
  };
}

export function fromResponse(data: unknown): CompletionResult {
  const response = data as AnthropicResponse;
  const text = response.content.find((block) => block.type === 'text')?.text;
  if (text === undefined) {
    throw new LLMBridgeError('Anthropic returned no content (possibly blocked or empty response)');
  }

  return {
    content: text,
    model: response.model,
    provider: 'anthropic',
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}