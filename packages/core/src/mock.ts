import {CompletionOptions, CompletionResult, LLMProvider} from "./types.js";

export class MockProvider implements LLMProvider {
    readonly calls: CompletionOptions[] = [];

    async complete(options: CompletionOptions): Promise<CompletionResult> {
        this.calls.push(options);
        return { content: 'mock response', model: 'mock', provider: 'mock' };
    }
}