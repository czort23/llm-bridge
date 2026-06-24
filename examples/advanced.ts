import 'dotenv/config';
import { NetworkError, RetryableError, withFallback, withRetry } from '@omnillm/core';
import { GeminiProvider } from '@omnillm/gemini';
import { GroqProvider } from '@omnillm/groq';
import { OllamaProvider } from '@omnillm/ollama';

if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not defined');
if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not defined');
if (!process.env.OLLAMA_API_KEY) throw new Error('OLLAMA_API_KEY is not defined');

const provider = withFallback(
  [
    withRetry(
      new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY, model: 'gemini-3.1-flash-lite' }),
      {
        maxAttempts: 5,
        initialDelayMs: 1000,
      },
    ),
    new GroqProvider({ apiKey: process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' }),
    new OllamaProvider({
      baseUrl: 'https://ollama.com',
      apiKey: process.env.OLLAMA_API_KEY,
      model: 'gpt-oss:120b',
    }),
  ],
  { shouldFallback: (error) => error instanceof RetryableError || error instanceof NetworkError },
);

const result = await provider.complete({
  messages: [{ role: 'user', content: 'Explain the meaning of life!' }],
});

console.log(result.content);
