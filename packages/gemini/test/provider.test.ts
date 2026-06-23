import { describe, it, vi, afterEach, expect } from 'vitest';
import { GeminiProvider } from '../src';
import { ProviderError } from '@omnillm/core';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GeminiProvider', () => {
  it('calls complete successfully', async () => {
    const fakeResponse = new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'hi' }] } }],
      usageMetadata: {
        promptTokenCount: 16,
        candidatesTokenCount: 64,
      },
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));

    const provider = new GeminiProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
    });

    const response = await provider.complete({ messages: [{ role: 'user', content: 'hi' }] });

    expect(response).toEqual({
      content: 'hi',
      model: 'mockModel',
      provider: 'gemini',
      usage: {
        inputTokens: 16,
        outputTokens: 64,
      },
    });
  });

  it('throws ProviderError if invalid JSON returned', async () => {
    const fakeResponse = new Response(`{
      candidates: { content: { parts: [{ text: 'hi' }] } }],
      usageMetadata: {
        promptTokenCount: 16,
        candidatesTokenCount: 64,
      },
    }`);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));

    const provider = new GeminiProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
    });

    await expect(provider.complete({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(ProviderError);
  });

  it('calls stream successfully', async () => {
    const sse = [
      'data: {"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}',
      'data: {"candidates":[{"content":{"parts":[{"text":" world"}]}}]}\n',
    ].join('\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(sse)));

    const provider = new GeminiProvider({
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

    const provider = new GeminiProvider({
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
      'data: {"candidates":[]}\n',
    ].join('\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(sse)));

    const provider = new GeminiProvider({
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