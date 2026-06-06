export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface CompletionOptions {
    model: string;
    messages: Message[];
    temperature?: number;
    maxTokens?: number;
}

export interface CompletionResult {
    content: string;
    model: string;
    provider: string;
    usage?: { inputTokens: number; outputTokens: number };
}

export interface LLMProvider {
    complete(options: CompletionOptions): Promise<CompletionResult>;
}