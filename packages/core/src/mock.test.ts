import { describe, it, expect } from 'vitest';
import { MockProvider } from './mock.js';
import type { Message } from './types.js';

const userMessage: Message = { role: 'user', content: 'hello' };

describe('MockProvider', () => {
  it('returns a fixed mock response', async () => {
    const provider = new MockProvider();
    const result = await provider.complete({ model: 'x', messages: [userMessage] });
    expect(result.content).toBe('mock response');
    expect(result.model).toBe('mock');
    expect(result.provider).toBe('mock');
  });

  it('records each call in order', async () => {
    const provider = new MockProvider();
    const first = { model: 'a', messages: [userMessage] };
    const second = { model: 'b', messages: [userMessage] };

    await provider.complete(first);
    await provider.complete(second);

    expect(provider.calls).toHaveLength(2);
    expect(provider.calls[0]).toEqual(first);
    expect(provider.calls[1]).toEqual(second);
  });

  it('starts with no recorded calls', () => {
    const provider = new MockProvider();
    expect(provider.calls).toHaveLength(0);
  });

  it('passes optional fields through to the call record', async () => {
    const provider = new MockProvider();
    const options = { model: 'x', messages: [userMessage], temperature: 0.5, maxTokens: 100 };

    await provider.complete(options);

    expect(provider.calls[0]).toEqual(options);
  });
});
