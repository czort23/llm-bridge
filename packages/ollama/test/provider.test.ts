import { describe, it, vi, afterEach, expect } from 'vitest';
import { OllamaProvider } from '../src';
import { ProviderError } from '@omnillm/core';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OllamaProvider', () => {
  it('calls complete successfully', async () => {
    const fakeResponse = new Response(JSON.stringify({
      message: { content: 'hi' },
      model: 'mockModel',
      prompt_eval_count: 16,
      eval_count: 64,
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));

    const provider = new OllamaProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
    });

    const response = await provider.complete({ messages: [{ role: 'user', content: 'hi' }] });

    expect(response).toEqual({
      content: 'hi',
      model: 'mockModel',
      provider: 'ollama',
      usage: {
        inputTokens: 16,
        outputTokens: 64,
      },
    });
  });

  it('throws ProviderError if invalid JSON returned', async () => {
    const fakeResponse = new Response(`{
      message: content: 'hi' },
      model: 'mockModel',
      prompt_eval_count: 16,
      eval_count: 64,
    }`);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));

    const provider = new OllamaProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
    });

    await expect(provider.complete({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(ProviderError);
  });

  it('calls stream successfully', async () => {
    const sse = [
      '{"message":{"content":"Hello"},"done":false}',
      '{"message":{"content":" world"},"done":true}\n',
    ].join('\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(sse)));

    const provider = new OllamaProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
    });

    const chunks: string[] = [];
    for await (const chunk of provider.stream({ messages: [{ role: 'user', content: 'hi' }] })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' world']);
  });

  it('throws ProviderError on null response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null)));

    const provider = new OllamaProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
    });

    await expect(async () => {
      for await (const _ of provider.stream({ messages: [{ role: 'user', content: 'hi' }] })) {}
    }).rejects.toThrow(ProviderError);
  });

  it("yields '' on missing delta", async () => {
    const sse = [
      '{"message":{},"done":true}\n',
    ].join('\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(sse)));

    const provider = new OllamaProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
    });

    const chunks: string[] = [];
    for await (const chunk of provider.stream({ messages: [{ role: 'user', content: 'hi' }] })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['']);
  });
});