import { describe, it, vi, afterEach, expect } from 'vitest';
import { OpenAIProvider } from '../src';

afterEach(() => {
  vi.unstubAllGlobals();
});

const okResponse = () =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: 'hi' } }],
      model: 'gpt-4o-mini',
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    }),
  );

describe('OpenAIProvider', () => {
  it('defaults to the OpenAI base URL and provider name', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    const provider = new OpenAIProvider({ apiKey: 'mockKey', model: 'gpt-4o-mini' });
    const result = await provider.complete({ messages: [{ role: 'user', content: 'hi' }] });

    expect(result.provider).toBe('openai');

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('lets an explicit baseUrl override the default', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    const provider = new OpenAIProvider({
      apiKey: 'mockKey',
      model: 'gpt-4o-mini',
      baseUrl: 'https://proxy.internal/v1',
    });
    await provider.complete({ messages: [{ role: 'user', content: 'hi' }] });

    expect(fetchMock.mock.calls[0][0]).toBe('https://proxy.internal/v1/chat/completions');
  });
});
