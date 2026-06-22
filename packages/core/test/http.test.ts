import { describe, it, vi, afterEach, expect } from 'vitest';
import {
  NetworkError,
  ProviderError,
  RetryableError,
  httpPost,
  DEFAULT_RETRYABLE_STATUS_CODES,
} from '../src';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('httpPost', () => {
  it('returns the response on success', async () => {
    const fakeResponse = new Response(JSON.stringify({ response: 'success' }), { status: 200 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));

    const result = await httpPost('https://api.example.com', {
      headers: {},
      body: {},
      retryableCodes: DEFAULT_RETRYABLE_STATUS_CODES,
      providerName: 'mockProvider',
    });

    expect(result).toBe(fakeResponse);
  });

  it('throws NetworkError when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));

    await expect(
      httpPost('https://api.example.com', {
        headers: {},
        body: {},
        retryableCodes: DEFAULT_RETRYABLE_STATUS_CODES,
        providerName: 'mockProvider',
      }),
    ).rejects.toThrow(NetworkError);
  });

  it('throws RetryableError for retryable status codes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('fail', { status: 429 })));

    const error = await httpPost('https://api.example.com', {
      headers: {},
      body: {},
      retryableCodes: DEFAULT_RETRYABLE_STATUS_CODES,
      providerName: 'mockProvider',
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RetryableError);
    expect(error).toMatchObject({ statusCode: 429 });
  });

  it('throws ProviderError for non-retryable status codes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('fail', { status: 400 })));

    const error = await httpPost('https://api.example.com', {
      headers: {},
      body: {},
      retryableCodes: DEFAULT_RETRYABLE_STATUS_CODES,
      providerName: 'mockProvider',
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderError);
    expect(error).not.toBeInstanceOf(RetryableError);
    expect(error).toMatchObject({ statusCode: 400 });
  });

  it('includes response body in thrown message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('fail', { status: 400, statusText: 'Bad Request' })),
    );

    await expect(
      httpPost('https://api.example.com', {
        headers: {},
        body: {},
        retryableCodes: DEFAULT_RETRYABLE_STATUS_CODES,
        providerName: 'mockProvider',
      }),
    ).rejects.toThrow('mockProvider returned 400 Bad Request: fail');
  });

  it('respects a custom retryableCodes list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('teapot', { status: 418, statusText: "I'm a teapot" })),
    );

    await expect(
      httpPost('https://api.example.com', {
        headers: {},
        body: {},
        retryableCodes: [418],
        providerName: 'mockProvider',
      }),
    ).rejects.toThrow(RetryableError);
  });
});
