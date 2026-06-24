import 'dotenv/config';
import type { CompletionOptions } from '@omnillm/core';
import { withFallback } from '@omnillm/core';
import { GeminiProvider } from '@omnillm/gemini';
import { GroqProvider } from '@omnillm/groq';
import { OllamaProvider } from '@omnillm/ollama';

if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not defined');
if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not defined');

const provider = withFallback([
  new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY, model: 'gemini-3.1-flash-lite' }),
  new GroqProvider({ apiKey: process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' }),
  new OllamaProvider({ model: 'llama3.2' }),
]);

const options: CompletionOptions = {
  messages: [{ role: 'user', content: 'Explain the meaning of life!' }],
};

for await (const chunk of provider.stream(options)) {
  process.stdout.write(chunk);
}
