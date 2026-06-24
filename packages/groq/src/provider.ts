import { OpenAICompatibleProvider } from '@omnillm/openai-compatible';

interface GroqConfig {
  baseUrl?: string;
  apiKey: string;
  model?: string;
}

export class GroqProvider extends OpenAICompatibleProvider {
  constructor(config: GroqConfig) {
    super({
      baseUrl: config.baseUrl ?? 'https://api.groq.com/openai/v1',
      apiKey: config.apiKey,
      model: config.model,
      providerName: 'Groq',
    });
  }
}
