export class LLMBridgeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'LLMBridgeError';
    }
}

export class NetworkError extends LLMBridgeError {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

export class ProviderError extends LLMBridgeError {
    constructor(message: string, public readonly statusCode: number) {
        super(message);
        this.name = 'ProviderError';
    }
}

export class RetryableError extends ProviderError {
    constructor(message: string, statusCode: number) {
        super(message, statusCode);
        this.name = 'RetryableError';
    }
}