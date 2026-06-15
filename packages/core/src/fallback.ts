import { RetryableError } from './errors.js';
import type { LLMProvider } from './types.js';

export interface FallbackOptions {
  shouldFallback?: (error: unknown) => boolean;
}

async function executeWithFallback<T>(
  providers: LLMProvider[],
  call: (provider: LLMProvider) => Promise<T>,
  options?: FallbackOptions,
): Promise<T> {
  const { shouldFallback = (error: unknown) => error instanceof RetryableError } = options ?? {};
  for (const provider of providers) {
    try {
      return await call(provider);
    } catch (error) {
      if (!shouldFallback(error)) throw error;
    }
  }
  throw new Error('All providers failed');
}

async function* executeStreamWithFallback(
  providers: LLMProvider[],
  call: (provider: LLMProvider) => AsyncIterable<string>,
  options?: FallbackOptions,
): AsyncIterable<string> {
  const { shouldFallback = (error: unknown) => error instanceof RetryableError } = options ?? {};
  let yielded = false;
  for (const provider of providers) {
    try {
      for await (const chunk of call(provider)) {
        yield chunk;
        yielded = true;
      }
      return;
    } catch (error) {
      if (!shouldFallback(error) || yielded) throw error;
    }
  }
  throw new Error('All providers failed');
}

/**
 * Wraps a list of providers with automatic fallback. Tries each provider in order,
 * moving to the next on retryable errors. Override `shouldFallback` to control when fallback triggers.
 */
export function withFallback(providers: LLMProvider[], options?: FallbackOptions): LLMProvider {
  return {
    complete: (opts) =>
      executeWithFallback(providers, (provider) => provider.complete(opts), options),
    stream: (opts) =>
      executeStreamWithFallback(providers, (provider) => provider.stream(opts), options),
  };
}
