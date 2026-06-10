import 'dotenv/config';
import { GeminiProvider } from '@llm-bridge/gemini';

if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not defined');

const provider = new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY });

const result = await provider.complete({
    model: 'gemini-3.1-flash-lite',
    messages: [{ role: 'user', content: 'Explain the meaning of life!' }],
});

console.log(result.content);