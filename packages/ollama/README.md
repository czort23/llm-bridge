# @omnillm/ollama

Ollama provider for [**omnillm**](https://github.com/czort23/omnillm), a unified TypeScript client for LLM providers. See the [main README](https://github.com/czort23/omnillm#readme) for resilience wrappers, error handling, and the full provider list.

Runs against a local [Ollama](https://ollama.com) server, so no API key is needed by default.

## Installation

```bash
npm install @omnillm/ollama
```

## Usage

```ts
import { OllamaProvider } from '@omnillm/ollama';

const provider = new OllamaProvider(); // defaults to http://localhost:11434

const result = await provider.complete({
  model: 'llama3.2',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(result.content);
```

### Streaming

```ts
for await (const chunk of provider.stream({
  model: 'llama3.2',
  messages: [{ role: 'user', content: 'Write a haiku about the sea.' }],
})) {
  process.stdout.write(chunk);
}
```

## Configuration

| Option    | Required | Default                  | Description                                        |
| --------- | -------- | ------------------------ | -------------------------------------------------- |
| `baseUrl` | no       | `http://localhost:11434` | URL of your Ollama server.                         |
| `model`   | no       | —                        | Default model, overridable per request.            |
| `apiKey`  | no       | —                        | Sent as a bearer token only if set (e.g. a proxy). |

## License

MIT
