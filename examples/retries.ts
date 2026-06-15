import 'dotenv/config';
import { GeminiProvider } from '@llm-bridge/gemini';
import { withRetry } from '@llm-bridge/core';

if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not defined');

const provider = withRetry(
  new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY, model: 'gemini-3.1-flash-lite' }),
);

const result = await provider.complete({
  messages: [{ role: 'user', content: 'Explain the meaning of life!' }],
});

console.log(result.content);
