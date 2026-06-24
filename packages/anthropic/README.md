# @omnillm/anthropic

Anthropic (Claude) provider for [**omnillm**](https://github.com/czort23/omnillm), a unified TypeScript client for LLM providers. See the [main README](https://github.com/czort23/omnillm#readme) for resilience wrappers, error handling, and the full provider list.

## Installation

```bash
npm install @omnillm/anthropic
```

## Usage

```ts
import { AnthropicProvider } from '@omnillm/anthropic';

const provider = new AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY });

const result = await provider.complete({
  model: 'claude-haiku-4-5',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(result.content);
```

### Streaming

```ts
for await (const chunk of provider.stream({
  model: 'claude-haiku-4-5',
  messages: [{ role: 'user', content: 'Write a haiku about the sea.' }],
})) {
  process.stdout.write(chunk);
}
```

## Configuration

| Option             | Required | Default                        | Description                              |
| ------------------ | -------- | ------------------------------ | ---------------------------------------- |
| `apiKey`           | yes      | —                              | Your Anthropic API key.                  |
| `model`            | no       | —                              | Default model, overridable per request.  |
| `baseUrl`          | no       | `https://api.anthropic.com/v1` | Point at a proxy or compatible endpoint. |
| `anthropicVersion` | no       | `2023-06-01`                   | Sent as the `anthropic-version` header.  |

> Anthropic requires `max_tokens` on every request. If you don't set `maxTokens`, it defaults to `4096`.

## License

MIT
