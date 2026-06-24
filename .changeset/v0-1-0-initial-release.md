---
'@omnillm/core': minor
'@omnillm/openai-compatible': minor
'@omnillm/openai': minor
'@omnillm/anthropic': minor
'@omnillm/gemini': minor
'@omnillm/groq': minor
'@omnillm/ollama': minor
---

Initial public release.

A lightweight, framework-agnostic TypeScript abstraction over LLM providers — write once against a single `LLMProvider` interface and switch between OpenAI, Anthropic, Gemini, Groq, and Ollama.

- Unified `complete` and `stream` API with a uniform request/response shape.
- Providers: OpenAI, Anthropic, Gemini, Groq, Ollama, plus `OpenAICompatibleProvider` for any OpenAI-compatible endpoint.
- Composable resilience wrappers: `withRetry` (exponential backoff) and `withFallback`.
- Typed error hierarchy (`LLMBridgeError` → `NetworkError`, `ProviderError` → `RetryableError`).
- ESM + CJS, fully typed, no heavy dependencies (built on the platform `fetch`).
