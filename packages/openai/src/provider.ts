import { OpenAICompatibleProvider } from '@omnillm/openai-compatible';

interface OpenAIConfig {
  baseUrl?: string;
  apiKey: string;
  model?: string;
}

export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor(config: OpenAIConfig) {
    super({
      baseUrl: config.baseUrl ?? 'https://api.openai.com/v1',
      apiKey: config.apiKey,
      model: config.model,
      providerName: 'OpenAI',
    });
  }
}
