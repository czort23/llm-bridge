import 'dotenv/config';
import { OllamaProvider } from "@llm-bridge/ollama";

if (!process.env.OLLAMA_API_KEY) throw new Error('OLLAMA_API_KEY is not defined');

const provider = new OllamaProvider({ baseUrl: 'https://ollama.com', apiKey: process.env.OLLAMA_API_KEY })

const result = await provider.complete({
    model: 'gpt-oss:120b',
    messages: [{ role: 'user', content: 'Explain the meaning of life!' }],
});

console.log(result.content);