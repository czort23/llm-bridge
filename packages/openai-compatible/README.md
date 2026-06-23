# @omnillm/openai-compatible

Base provider and Chat Completions mapping for OpenAI-compatible APIs, part of [**omnillm**](https://github.com/czort23/omnillm).

Use `OpenAICompatibleProvider` directly for any service that speaks the OpenAI Chat Completions API but doesn't have a dedicated package — Together, Fireworks, OpenRouter, DeepSeek, a local vLLM or LM Studio server, and so on. `@omnillm/openai` and `@omnillm/groq` are thin wrappers over this base with their `baseUrl` and `providerName` pre-filled.

## Installation

```bash
npm install @omnillm/openai-compatible
```

## Usage

```ts
import { OpenAICompatibleProvider } from '@omnillm/openai-compatible';

const provider = new OpenAICompatibleProvider({
  baseUrl: 'https://api.together.xyz/v1',
  apiKey: process.env.TOGETHER_API_KEY,
  providerName: 'Together',
});

const result = await provider.complete({
  model: 'meta-llama/Llama-3-70b-chat-hf',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(result.content);
```

### Streaming

```ts
for await (const chunk of provider.stream({ model, messages })) {
  process.stdout.write(chunk);
}
```

## Configuration

| Option         | Required | Description                                                        |
| -------------- | -------- | ------------------------------------------------------------------ |
| `baseUrl`      | yes      | Base URL of the API (the `/chat/completions` path is appended).    |
| `apiKey`       | yes      | Bearer token, sent as `Authorization: Bearer <apiKey>`.            |
| `providerName` | yes      | Label used in error messages and on the result's `provider` field. |
| `model`        | no       | Default model, overridable per request.                            |

See the [main README](https://github.com/czort23/omnillm#readme) for resilience wrappers, error handling, and the full provider list.

## License

MIT
