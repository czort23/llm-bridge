# @omnillm/core

Core interfaces, errors, and resilience helpers for [**omnillm**](https://github.com/czort23/omnillm) — a unified TypeScript client for LLM providers.

You usually don't install this directly. Each provider package (`@omnillm/openai`, `@omnillm/anthropic`, …) depends on it, so it comes along automatically. Install it explicitly only when you import the resilience wrappers or error types yourself.

## Installation

```bash
npm install @omnillm/core
```

## What's inside

- **`LLMProvider`** — the interface every provider implements (`complete` + `stream`).
- **Resilience wrappers** — `withRetry` and `withFallback`. Each takes a provider and returns a provider, so they compose.
- **Error hierarchy** — `LLMBridgeError` → `NetworkError`, `ProviderError` → `RetryableError`.

## Resilience

```ts
import { withRetry, withFallback } from '@omnillm/core';

// retry each provider, then fall back between them
const provider = withFallback([withRetry(openai), withRetry(anthropic)]);
```

`withRetry` retries transient failures (429, 5xx) with exponential backoff; `withFallback` moves to the next provider on a retryable error. See the [main README](https://github.com/czort23/omnillm#resilience) for defaults and details.

## Errors

```
LLMBridgeError
├─ NetworkError      the request never reached the provider
└─ ProviderError     the provider returned an error (has .statusCode)
   └─ RetryableError a transient ProviderError (429, 5xx) — what retry/fallback act on
```

```ts
import { ProviderError, RetryableError } from '@omnillm/core';

try {
  await provider.complete({ model, messages });
} catch (error) {
  if (error instanceof RetryableError) {
    // transient — safe to retry
  } else if (error instanceof ProviderError) {
    console.error(`Provider error ${error.statusCode}: ${error.message}`);
  }
}
```

## License

MIT
