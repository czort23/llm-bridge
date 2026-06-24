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
    expect(request.system).toBeUndefined();
    expect(request.temperature).toBe(0.7);
    expect(request.max_tokens).toBe(128);
    expect(request.stream).toBe(false);
  });

  it("maps CompletionOptions to provider's format with system message", () => {
    const request = toRequest({
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'system', content: 'test' },
      ],
    });

    expect(request.messages[0]).toEqual({ role: 'user', content: 'hi' });
    expect(request.system?.[0]).toEqual({ text: 'test', type: 'text' });
  });

  it('defaults max_tokens to 4096 when not provided', () => {
    const request = toRequest({ model: 'mockModel', messages: [{ role: 'user', content: 'hi' }] });
    expect(request.max_tokens).toBe(4096);
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
      content: [{ type: 'text', text: 'hi' }],
      model: 'mockModel',
      usage: { input_tokens: 16, output_tokens: 64 },
    });

    expect(response.content).toBe('hi');
    expect(response.model).toBe('mockModel');
    expect(response.provider).toBe('anthropic');
    expect(response.usage).toEqual({ inputTokens: 16, outputTokens: 64 });
  });

  it('throws when content is missing', () => {
    expect(() => fromResponse({ content: [], model: 'mockModel' })).toThrow(LLMBridgeError);
  });
});
