import type { CompletionOptions, CompletionResult, LLMProvider } from "./types.js";
import { RetryableError } from "./errors.js";

export class MockProvider implements LLMProvider {
    readonly calls: CompletionOptions[] = [];

    complete(options: CompletionOptions): Promise<CompletionResult> {
        this.calls.push(options);
        return Promise.resolve({ content: 'mock response', model: 'mock', provider: 'mock' });
    }

    async *stream(options: CompletionOptions): AsyncIterable<string> {
        this.calls.push(options);
        await Promise.resolve();
        yield 'mock ';
        yield 'response';
    }
}

export class FailingMockProvider implements LLMProvider {
    readonly calls: CompletionOptions[] = [];
    private failsRemaining: number;

    constructor(failTimes: number) {
        this.failsRemaining = failTimes;
    }

    complete(options: CompletionOptions): Promise<CompletionResult> {
        this.calls.push(options);
        if (this.failsRemaining-- > 0) throw new RetryableError('fail', 500);
        return Promise.resolve({ content: 'mock response', model: 'mock', provider: 'mock' });
    }

    async *stream(options: CompletionOptions): AsyncIterable<string> {
        this.calls.push(options);
        if (this.failsRemaining-- > 0) throw new RetryableError('fail', 500);
        await Promise.resolve();
        yield 'mock ';
        yield 'response';
    }
}