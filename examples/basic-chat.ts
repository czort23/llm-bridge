import { OllamaProvider } from "@llm-bridge/ollama";

const provider = new OllamaProvider();

const result = await provider.complete({
    model: 'llama3.2',
    messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(result.content);