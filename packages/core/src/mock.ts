import {CompletionOptions, CompletionResult, LLMProvider} from "./types.js";

export class MockProvider implements LLMProvider {
    readonly calls: CompletionOptions[] = [];

    complete(options: CompletionOptions): Promise<CompletionResult> {
        this.calls.push(options);
        return Promise.resolve({ content: 'mock response', model: 'mock', provider: 'mock' });
    }
}