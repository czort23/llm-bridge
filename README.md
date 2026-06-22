# omnillm

A lightweight, framework-agnostic TypeScript abstraction over LLM providers. Write your code once against a single interface, and switch between OpenAI, Anthropic, Gemini, Groq, and Ollama by changing one line.

```ts
import { OpenAIProvider } from '@omnillm/openai';

const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });

const result = await provider.complete({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(result.content);
```

## Why

Every LLM provider ships its own SDK with its own shapes, its own auth, its own streaming format. The moment you want to support a second provider — or fall back to one when another is rate-limited — you end up writing adapter code by hand.

`omnillm` gives you:

- **One interface** (`LLMProvider`) for completion and streaming across every provider.
- **A uniform request/response shape**, so swapping providers never touches your application code.
- **Built-in resilience** — retry with backoff and multi-provider fallback, as composable wrappers.
- **A typed error hierarchy**, so you can tell a rate limit apart from a bad request.
- **No heavy dependencies** — built on the platform `fetch`, ESM + CJS, fully typed.

## Requirements

- Node.js 18+ (uses the global `fetch`)

## Installation

Install the provider package(s) you need. Each pulls in `@omnillm/core` automatically:

```bash
npm install @omnillm/openai
```

The resilience helpers and error types live in core. If you import them directly, add it explicitly:

```bash
npm install @omnillm/core
```

## Quick start

### Completion

```ts
import { AnthropicProvider } from '@omnillm/anthropic';

const provider = new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY });

const result = await provider.complete({
  model: 'claude-haiku-4-5',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain recursion in one sentence.' },
  ],
});

console.log(result.content);
console.log(result.usage); // { inputTokens, outputTokens }
```

### Streaming

`stream()` returns an async iterable of text chunks:

```ts
for await (const chunk of provider.stream({
  model: 'claude-haiku-4-5',
  messages: [{ role: 'user', content: 'Write a haiku about the sea.' }],
})) {
  process.stdout.write(chunk);
}
```

## Providers

| Provider  | Package                 | Class               | Notes                           |
| --------- | ----------------------- | ------------------- | ------------------------------- |
| OpenAI    | `@omnillm/openai`    | `OpenAIProvider`    |                                 |
| Anthropic | `@omnillm/anthropic` | `AnthropicProvider` | `max_tokens` defaults to 4096   |
| Gemini    | `@omnillm/gemini`    | `GeminiProvider`    |                                 |
| Groq      | `@omnillm/groq`      | `GroqProvider`      | OpenAI-compatible               |
| Ollama    | `@omnillm/ollama`    | `OllamaProvider`    | Runs locally; `apiKey` optional |

All providers share the same constructor shape:

```ts
new OpenAIProvider({
  apiKey: '...', // required (except Ollama, where it's optional)
  model: '...', // optional default model, overridable per request
  baseUrl: '...', // optional, to point at a proxy or compatible endpoint
});
```

`AnthropicProvider` also accepts `anthropicVersion` (defaults to `'2023-06-01'`).
`OllamaProvider`'s `baseUrl` defaults to `http://localhost:11434`.

The `model` can be set once on the provider, or per call via `CompletionOptions.model` (the per-call value wins). At least one must be present, or the call throws.

## Core types

```ts
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CompletionOptions {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface CompletionResult {
  content: string;
  model: string;
  provider: string;
  usage?: { inputTokens: number; outputTokens: number };
}

interface LLMProvider {
  complete(options: CompletionOptions): Promise<CompletionResult>;
  stream(options: CompletionOptions): AsyncIterable<string>;
}
```

## Resilience

Because every provider implements the same `LLMProvider` interface, resilience can be added as wrappers — they take a provider and return a provider, so they compose.

### Retry

Retries on transient failures (rate limits and 5xx) with exponential backoff. Non-retryable errors are re-thrown immediately. For streams, it only retries if no chunks have been emitted yet.

```ts
import { withRetry } from '@omnillm/core';

const resilient = withRetry(provider, {
  maxAttempts: 3, // default 3
  initialDelayMs: 500, // default 500ms, doubled each attempt
});

const result = await resilient.complete({ model, messages });
```

### Fallback

Tries each provider in order, moving to the next on a retryable error:

```ts
import { withFallback } from '@omnillm/core';

const provider = withFallback([primary, secondary, tertiary]);
```

The wrappers compose — give each provider its own retry, then fall back between them:

```ts
const provider = withFallback([withRetry(openai), withRetry(anthropic)]);
```

## Error handling

All errors extend `LLMBridgeError`:

```
LLMBridgeError
├─ NetworkError              the request never reached the provider
└─ ProviderError            the provider returned an error (has .statusCode)
   └─ RetryableError        a transient ProviderError (429, 5xx) — what retry/fallback act on
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

Note that `RetryableError` extends `ProviderError`, so an `instanceof ProviderError` check matches both — check for `RetryableError` first if you need to distinguish them.

## Status

Pre-release (`v0.1.0`). The interface may still change before `1.0`. Feedback and issues welcome.

## License

MIT
