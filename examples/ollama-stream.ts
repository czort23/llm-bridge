import { OllamaProvider } from "@llm-bridge/ollama";
import type { CompletionOptions } from "@llm-bridge/core";

const provider = new OllamaProvider();

const options: CompletionOptions = {
    model: 'llama3.2',
    messages: [{ role: 'user', content: 'Explain the meaning of life!' }]
};

for await (const chunk of provider.stream(options)) {
    process.stdout.write(chunk);
}