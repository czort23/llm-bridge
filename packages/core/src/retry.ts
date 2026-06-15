import { RetryableError } from './errors.js';
import type { LLMProvider } from './types.js';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeWithRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const { maxAttempts = 3, initialDelayMs = 500 } = options ?? {};
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (!(error instanceof RetryableError)) throw error;
      attempt++;
      if (attempt >= maxAttempts) throw error;
      await sleep(initialDelayMs * Math.pow(2, attempt - 1));
    }
  }
}

async function* executeStreamWithRetry(
  fn: () => AsyncIterable<string>,
  options?: RetryOptions,
): AsyncIterable<string> {
  const { maxAttempts = 3, initialDelayMs = 500 } = options ?? {};
  let yielded = false;
  let attempt = 0;
  for (;;) {
    try {
      for await (const chunk of fn()) {
        yield chunk;
        yielded = true;
      }
      return;
    } catch (error) {
      if (!(error instanceof RetryableError) || yielded) throw error;
      attempt++;
      if (attempt >= maxAttempts) throw error;
      await sleep(initialDelayMs * Math.pow(2, attempt - 1));
    }
  }
}

export function withRetry(provider: LLMProvider, options?: RetryOptions): LLMProvider {
  return {
    complete: (opts) => executeWithRetry(() => provider.complete(opts), options),
    stream: (opts) => executeStreamWithRetry(() => provider.stream(opts), options),
  };
}
