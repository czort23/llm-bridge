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
    expect(request.temperature).toBe(0.7);
    expect(request.max_completion_tokens).toBe(128);
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
    const response = fromResponse(
      {
        choices: [{ message: { content: 'hi' } }],
        model: 'mockModel',
        usage: { prompt_tokens: 16, completion_tokens: 64 },
      },
      'MockProvider',
    );

    expect(response.content).toBe('hi');
    expect(response.model).toBe('mockModel');
    expect(response.provider).toBe('mockprovider');
    expect(response.usage).toEqual({ inputTokens: 16, outputTokens: 64 });
  });

  it('throws when content is missing', () => {
    expect(() =>
      fromResponse(
        { choices: [], model: 'mockModel', usage: { prompt_tokens: 16, completion_tokens: 64 } },
        'MockProvider',
      ),
    ).toThrow(LLMBridgeError);
  });
});
