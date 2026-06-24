import { describe, it, expect } from 'vitest';
import { toRequest, fromResponse } from '../src/mapping.js';
import { LLMBridgeError } from '@omnillm/core';

describe('toRequest/fromResponse', () => {
  it("maps CompletionOptions to provider's format", () => {
    const request = toRequest({
      model: 'mockModel',
      messages: [{ role: 'user', content: 'hi' }],
      temperature: 0.7,
      maxTokens: 128,
    });

    expect(request.model).toBe('mockModel');
    expect(request.messages[0]).toEqual({ role: 'user', content: 'hi' });
    expect(request.options).toEqual({ temperature: 0.7, num_predict: 128 });
    expect(request.stream).toBe(false);
  });

  it('sets stream when requested', () => {
    const request = toRequest(
      { model: 'mockModel', messages: [{ role: 'user', content: 'hi' }] },
      true,
    );
    expect(request.stream).toBe(true);
  });

  it('maps a response to a CompletionResult', () => {
    const response = fromResponse({
      message: { content: 'hi' },
      model: 'mockModel',
      prompt_eval_count: 16,
      eval_count: 64,
    });

    expect(response.content).toBe('hi');
    expect(response.model).toBe('mockModel');
    expect(response.provider).toBe('ollama');
    expect(response.usage).toEqual({ inputTokens: 16, outputTokens: 64 });
  });

  it('throws when content is missing', () => {
    expect(() => fromResponse({ message: {}, model: 'mockModel' })).toThrow(LLMBridgeError);
  });
});
