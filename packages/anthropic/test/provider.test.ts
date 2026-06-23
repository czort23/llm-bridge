import { describe, it, vi, afterEach, expect } from 'vitest';
import { AnthropicProvider } from '../src';
import { ProviderError } from '@omnillm/core';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AnthropicProvider', () => {
  it('calls complete successfully', async () => {
    const fakeResponse = new Response(JSON.stringify({
      content: [{ type: 'text', text: 'hi' }],
      model: 'mockModel',
      usage: { input_tokens: 16, output_tokens: 64 },
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));

    const provider = new AnthropicProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
    });

    const response = await provider.complete({ messages: [{ role: 'user', content: 'hi' }] });

    expect(response).toEqual({
      content: 'hi',
      model: 'mockModel',
      provider: 'anthropic',
      usage: {
        inputTokens: 16,
        outputTokens: 64,
      },
    });
  });

  it('throws ProviderError if invalid JSON returned', async () => {
    const fakeResponse = new Response(`{
      content: { type: 'text', text: 'hi' }],
      model: 'mockModel',
      usage: { input_tokens: 16, output_tokens: 64 },
    }`);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));

    const provider = new AnthropicProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
    });

    await expect(provider.complete({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(ProviderError);
  });

  it('calls stream successfully', async () => {
    const sse = [
      'event: content_block_delta',
      'data: {"type":"content_block_delta","delta":{"text":"Hello"}}',
      'data: {"type":"content_block_delta","delta":{"text":" world"}}',
      'data: {"type":"message_stop"}\n',
    ].join('\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(sse)));

    const provider = new AnthropicProvider({
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

    const provider = new AnthropicProvider({
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
      'data: {"type":"content_block_delta","delta":{}}',
      'data: {"type":"message_stop"}\n',
    ].join('\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(sse)));

    const provider = new AnthropicProvider({
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

  it('skips non-delta events', async () => {
    const sse = [
      'data: {"type":"message_start"}',
      'data: {"type":"content_block_start"}',
      'data: {"type":"content_block_delta","delta":{"text":"Hello"}}',
      'data: {"type":"ping"}',
      'data: {"type":"message_stop"}\n',
    ].join('\n');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(sse)));

    const provider = new AnthropicProvider({
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'mockKey',
      model: 'mockModel',
    });

    const chunks: string[] = [];
    for await (const chunk of provider.stream({ messages: [{ role: 'user', content: 'hi' }] })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello']);
  });
});