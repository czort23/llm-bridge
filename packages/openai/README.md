# @omnillm/openai

OpenAI provider for [**omnillm**](https://github.com/czort23/omnillm), a unified TypeScript client for LLM providers. See the [main README](https://github.com/czort23/omnillm#readme) for resilience wrappers, error handling, and the full provider list.

## Installation

```bash
npm install @omnillm/openai
```

## Usage

```ts
import { OpenAIProvider } from '@omnillm/openai';

const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY });

const result = await provider.complete({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(result.content);
```

### Streaming

```ts
for await (const chunk of provider.stream({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Write a haiku about the sea.' }],
})) {
  process.stdout.write(chunk);
}
```

## Configuration

| Option    | Required | Default                     | Description                              |
| --------- | -------- | --------------------------- | ---------------------------------------- |
| `apiKey`  | yes      | —                           | Your OpenAI API key.                     |
| `model`   | no       | —                           | Default model, overridable per request.  |
| `baseUrl` | no       | `https://api.openai.com/v1` | Point at a proxy or compatible endpoint. |

## License

MIT
