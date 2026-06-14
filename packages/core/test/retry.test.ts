import { describe, it, expect } from "vitest";
import { FailingMockProvider } from "../src/mock.js";
import { ProviderError, RetryableError, withRetry } from "../src";
import type { CompletionOptions, Message } from "../src";

const userMessage: Message = { role: 'user', content: 'hello' };
const options: CompletionOptions = { messages: [userMessage] };

describe('withRetry', () => {
    it('succeeds on first try', async () => {
        const inner = new FailingMockProvider(0);
        const provider = withRetry(inner, { initialDelayMs: 0 });
        const result = await provider.complete(options);
        expect(result).toEqual({ content: 'mock response', model: 'mock', provider: 'mock' });
        expect(inner.calls).toHaveLength(1);
    });

    it('retries on RetryableError, succeeds on second attempt', async () => {
        const inner = new FailingMockProvider(1);
        const provider = withRetry(inner, { initialDelayMs: 0 });
        const result = await provider.complete(options);
        expect(result).toEqual({ content: 'mock response', model: 'mock', provider: 'mock' });
        expect(inner.calls).toHaveLength(2);
    });

    it('throws after maxAttempts exhausted', async () => {
        const inner = new FailingMockProvider(99);
        const provider = withRetry(inner, { initialDelayMs: 0 });
        await expect(provider.complete(options)).rejects.toThrow('fail');
        expect(inner.calls).toHaveLength(3);
    });

    it('does not retry on non-retryable errors', async () => {
        const inner = new FailingMockProvider(99);
        inner.complete = () => { throw new ProviderError('bad request', 400); };
        const provider = withRetry(inner, { initialDelayMs: 0 });
        await expect(provider.complete(options)).rejects.toThrow('bad request');
        expect(inner.calls).toHaveLength(0);
    });

    it('retries stream on RetryableError, succeeds on second attempt', async () => {
        const inner = new FailingMockProvider(1);
        const provider = withRetry(inner, { initialDelayMs: 0 });
        const chunks: string[] = [];
        for await (const chunk of provider.stream(options)) {
            chunks.push(chunk);
        }
        expect(chunks.join('')).toBe('mock response');
        expect(inner.calls).toHaveLength(2);
    });

    it('does not retry stream if chunks already yielded', async () => {
        const inner = new FailingMockProvider(0);
        inner.stream = async function* () {
            yield 'partial';
            throw new RetryableError('fail', 500);
        };
        const provider = withRetry(inner, { initialDelayMs: 0 });
        const chunks: string[] = [];
        await expect(async () => {
            for await (const chunk of provider.stream(options)) {
                chunks.push(chunk);
            }
        }).rejects.toThrow('fail');
        expect(chunks).toEqual(['partial']);
    });
});