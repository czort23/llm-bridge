# @omnillm/groq

Groq provider for [**omnillm**](https://github.com/czort23/omnillm), a unified TypeScript client for LLM providers. See the [main README](https://github.com/czort23/omnillm#readme) for resilience wrappers, error handling, and the full provider list.

Groq exposes an OpenAI-compatible API, so this provider is a thin wrapper over [`@omnillm/openai-compatible`](https://github.com/czort23/omnillm/tree/main/packages/openai-compatible).

## Installation

```bash
npm install @omnillm/groq
```

## Usage

```ts
import { GroqProvider } from '@omnillm/groq';

const provider = new GroqProvider({ apiKey: process.env.GROQ_API_KEY });

const result = await provider.complete({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(result.content);
```

### Streaming

```ts
for await (const chunk of provider.stream({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Write a haiku about the sea.' }],
})) {
  process.stdout.write(chunk);
}
```

## Configuration

| Option    | Required | Default                          | Description                              |
| --------- | -------- | -------------------------------- | ---------------------------------------- |
| `apiKey`  | yes      | —                                | Your Groq API key.                       |
| `model`   | no       | —                                | Default model, overridable per request.  |
| `baseUrl` | no       | `https://api.groq.com/openai/v1` | Point at a proxy or compatible endpoint. |

## License

MIT
