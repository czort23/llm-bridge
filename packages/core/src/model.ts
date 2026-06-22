import { LLMBridgeError } from './errors.js';

export function resolveModel(perCall: string | undefined, fallback: string | undefined): string {
  const model = perCall ?? fallback;
  if (!model) throw new LLMBridgeError('No model specified');
  return model;
}
