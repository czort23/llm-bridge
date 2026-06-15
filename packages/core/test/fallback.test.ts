import { describe, it, expect } from 'vitest';
import { FailingMockProvider } from '../src/mock.js';
import { ProviderError, RetryableError, withFallback } from '../src';
import type { CompletionOptions, Message } from '../src';

const userMessage: Message = { role: 'user', content: 'hello' };
const options: CompletionOptions = { messages: [userMessage] };

describe('withFallback', () => {
  it("return first provider's result if it succeeds", async () => {
    const inner1 = new FailingMockProvider(0);
    const inner2 = new FailingMockProvider(0);
    const provider = withFallback([inner1, inner2]);
    const result = await provider.complete(options);
    expect(result).toEqual({ content: 'mock response', model: 'mock', provider: 'mock' });
    expect(inner1.calls).toHaveLength(1);
    expect(inner2.calls).toHaveLength(0);
  });

  it('falls back to second provider on RetryableError', async () => {
    const inner1 = new FailingMockProvider(1);
    const inner2 = new FailingMockProvider(0);
    const provider = withFallback([inner1, inner2]);
    const result = await provider.complete(options);
    expect(result).toEqual({ content: 'mock response', model: 'mock', provider: 'mock' });
    expect(inner1.calls).toHaveLength(1);
    expect(inner2.calls).toHaveLength(1);
  });

  it('does not fall back on non-retryable error', async () => {
    const inner1 = new FailingMockProvider(0);
    const inner2 = new FailingMockProvider(0);
    inner1.complete = () => {
      throw new ProviderError('bad request', 400);
    };
    const provider = withFallback([inner1, inner2]);
    await expect(provider.complete(options)).rejects.toThrow('bad request');
    expect(inner2.calls).toHaveLength(0);
  });

  it("throws 'All providers failed' if all providers fail", async () => {
    const inner1 = new FailingMockProvider(0);
    const inner2 = new FailingMockProvider(0);
    inner1.complete = () => {
      throw new RetryableError('fail', 500);
    };
    inner2.complete = () => {
      throw new RetryableError('fail', 500);
    };
    const provider = withFallback([inner1, inner2]);
    await expect(provider.complete(options)).rejects.toThrow('All providers failed');
  });

  it('stream falls back to second provider on RetryableError', async () => {
    const inner1 = new FailingMockProvider(1);
    const inner2 = new FailingMockProvider(0);
    const provider = withFallback([inner1, inner2]);
    const chunks: string[] = [];
    for await (const chunk of provider.stream(options)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe('mock response');
    expect(inner1.calls).toHaveLength(1);
    expect(inner2.calls).toHaveLength(1);
  });

  it('stream does not fall back if chunks already yielded', async () => {
    const inner1 = new FailingMockProvider(1);
    const inner2 = new FailingMockProvider(0);
    inner1.stream = async function* () {
      yield 'partial';
      throw new RetryableError('fail', 500);
    };
    const provider = withFallback([inner1, inner2]);
    const chunks: string[] = [];
    await expect(async () => {
      for await (const chunk of provider.stream(options)) {
        chunks.push(chunk);
      }
    }).rejects.toThrow('fail');
    expect(chunks).toEqual(['partial']);
    expect(inner2.calls).toHaveLength(0);
  });
});
