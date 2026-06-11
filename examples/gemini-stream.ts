import 'dotenv/config';
import { GeminiProvider } from "@llm-bridge/gemini";
import type { CompletionOptions } from "@llm-bridge/core";

if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not defined');

const provider = new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY });

const options: CompletionOptions = {
    model: 'gemini-3.1-flash-lite',
    messages: [{ role: 'user', content: 'Explain the meaning of life!' }],
};

for await (const chunk of provider.stream(options)) {
    process.stdout.write(chunk);
}