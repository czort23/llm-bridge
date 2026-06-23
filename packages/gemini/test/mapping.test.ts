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

    expect(request.contents[0].role).toBe('user');
    expect(request.contents[0].parts[0].text).toBe('hi');
    expect(request.systemInstruction).toBeUndefined();
    expect(request.generationConfig).toEqual({ temperature: 0.7, maxOutputTokens: 128 });
  });

  it("maps assistant role to model role", () => {
    const request = toRequest({
      messages: [{ role: 'assistant', content: 'hi' }],
    });

    expect(request.contents[0].role).toBe('model');
  });

  it("maps CompletionOptions to provider's format with system message", () => {
    const request = toRequest({
      messages: [{ role: 'system', content: 'test' }],
    });

    expect(request.systemInstruction?.parts[0]).toEqual({ text: 'test' });
  });

  it('maps a response to a CompletionResult', () => {
    const response = fromResponse(
      {
        candidates: [{ content: { parts: [{ text: 'hi' }] } }],
        usageMetadata: { promptTokenCount: 16, candidatesTokenCount: 64 },
      },
      'mockModel'
    );

    expect(response.content).toBe('hi');
    expect(response.model).toBe('mockModel');
    expect(response.provider).toBe('gemini');
    expect(response.usage).toEqual({ inputTokens: 16, outputTokens: 64 });
  });

  it('throws when content is missing', () => {
    expect(() => fromResponse({ candidates: [] }, 'mockModel')).toThrow(LLMBridgeError);
  });
});