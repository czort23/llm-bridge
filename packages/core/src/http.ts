import { NetworkError, ProviderError, RetryableError } from './errors.js';

export const DEFAULT_RETRYABLE_STATUS_CODES: readonly number[] = [429, 500, 502, 503, 504];

interface HttpPostOptions {
  headers: Record<string, string>;
  body: unknown;
  retryableCodes: readonly number[];
  providerName: string;
}

export async function httpPost(url: string, options: HttpPostOptions): Promise<Response> {
  const { headers, body, retryableCodes, providerName } = options;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new NetworkError(`Could not reach ${providerName} at ${url}: ${String(error)}`);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    const message = `${providerName} returned ${String(response.status)} ${response.statusText}: ${errorBody}`;
    if (retryableCodes.includes(response.status)) {
      throw new RetryableError(message, response.status);
    }
    throw new ProviderError(message, response.status);
  }

  return response;
}