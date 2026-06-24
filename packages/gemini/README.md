# @omnillm/gemini

Google Gemini provider for [**omnillm**](https://github.com/czort23/omnillm), a unified TypeScript client for LLM providers. See the [main README](https://github.com/czort23/omnillm#readme) for resilience wrappers, error handling, and the full provider list.

## Installation

```bash
npm install @omnillm/gemini
```

## Usage

```ts
import { GeminiProvider } from '@omnillm/gemini';

const provider = new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY });

const result = await provider.complete({
  model: 'gemini-1.5-flash',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(result.content);
```

### Streaming

```ts
for await (const chunk of provider.stream({
  model: 'gemini-1.5-flash',
  messages: [{ role: 'user', content: 'Write a haiku about the sea.' }],
})) {
  process.stdout.write(chunk);
}
```

## Configuration

| Option    | Required | Default                                        | Description                              |
| --------- | -------- | ---------------------------------------------- | ---------------------------------------- |
| `apiKey`  | yes      | —                                              | Your Gemini API key.                     |
| `model`   | no       | —                                              | Default model, overridable per request.  |
| `baseUrl` | no       | `https://generativelanguage.googleapis.com/v1` | Point at a proxy or compatible endpoint. |

## License

MIT
