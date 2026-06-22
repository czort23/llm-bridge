import { describe, it, expect } from 'vitest';
import { resolveModel } from '../src';

describe('resolveModel', () => {
  it('resolves to per-call model', () => {
    const model = resolveModel('mockPerCall', 'mockFallback');
    expect(model).toBe('mockPerCall');
  });

  it('resolves to fallback model', () => {
    const model = resolveModel(undefined, 'mockFallback');
    expect(model).toBe('mockFallback');
  });

  it('throws if no model passed', () => {
    expect(() => resolveModel(undefined, undefined)).toThrow('No model specified');
  });

  it('throws when the per-call model is an empty string', () => {
    expect(() => resolveModel('', 'mockFallback')).toThrow('No model specified');
  });
});