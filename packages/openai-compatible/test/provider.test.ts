import { describe, it, vi, afterEach, expect } from 'vitest';
import { OpenAICompatibleProvider } from '../src';
import { ProviderError } from '@omnillm/core';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OpenAICompatibleProvider', () => {
  it('calls complete successfully', async () => {
    const fakeResponse = new Response(
      JSON.stringify({
        choices: [{ message: { content: 'hi' } }],
        model: 'mockModel',
        usage: { prompt_tokens: 16, completion_tokens: 64 },
      }),
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));

    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
      providerName: 'MockProvider',
    });

    const response = await provider.complete({ messages: [{ role: 'user', content: 'hi' }] });

    expect(response).toEqual({
      content: 'hi',
      model: 'mockModel',
      provider: 'mockprovider',
      usage: {
        inputTokens: 16,
        outputTokens: 64,
      },
    });
  });

  it('throws ProviderError if invalid JSON returned', async () => {
    const fakeResponse = new Response(`{
      choices: { message: { content: 'hi' } }],
      model: 'mockModel',
      usage: { prompt_tokens: 16, completion_tokens: 64 },
    }`);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));

    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
      providerName: 'MockProvider',
    });

    await expect(
      provider.complete({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow(ProviderError);
  });

  it('calls stream successfully', async () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      'data: [DONE]',
    ].join('\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(sse)));

    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
      providerName: 'MockProvider',
    });

    const chunks: string[] = [];
    for await (const chunk of provider.stream({ messages: [{ role: 'user', content: 'hi' }] })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' world']);
  });

  it('throws ProviderError on null response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null)));

    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
      providerName: 'MockProvider',
    });

    await expect(async () => {
      for await (const _ of provider.stream({ messages: [{ role: 'user', content: 'hi' }] })) {
      }
    }).rejects.toThrow(ProviderError);
  });

  it("yields '' on missing delta", async () => {
    const sse = ['data: {"choices":[{"delta":{}}]}', 'data: [DONE]'].join('\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(sse)));

    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
      providerName: 'MockProvider',
    });

    const chunks: string[] = [];
    for await (const chunk of provider.stream({ messages: [{ role: 'user', content: 'hi' }] })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['']);
  });
});
