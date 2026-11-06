import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadEnv } from '../src/config/env.js';
import { OpenAiCompatibleVisionProvider } from '../src/services/openai-compatible.provider.js';

const env = loadEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://unused/test',
  VISION_API_KEY: 'test-private-api-key',
  VISION_API_BASE_URL: 'https://vision.example/v1',
  VISION_MODEL: 'test-vision-model',
});
const image = Buffer.from('private-test-image');
const valid = {
  objectName: 'Router', category: 'Red', brand: null, model: null, confidence: 0.8,
  description: 'Distribuye Wi-Fi.', visibleText: [], warnings: [],
};

describe('OpenAiCompatibleVisionProvider', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends an image to chat completions and validates the response', async () => {
    fetchMock.mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify(valid) } }] }));

    expect(await new OpenAiCompatibleVisionProvider(env).analyzeImage(image)).toEqual(valid);
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://vision.example/v1/chat/completions');
    expect(request?.headers).toMatchObject({ Authorization: `Bearer ${env.VISION_API_KEY}` });
    const body = JSON.parse(request?.body as string);
    expect(body.model).toBe(env.VISION_MODEL);
    expect(body.messages[0].content[1].image_url.url).toBe(`data:image/jpeg;base64,${image.toString('base64')}`);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'VISION_ACCESS_DENIED'],
    [403, 'VISION_ACCESS_DENIED'],
    [404, 'VISION_CONFIGURATION_ERROR'],
    [400, 'VISION_REQUEST_REJECTED'],
    [422, 'VISION_REQUEST_REJECTED'],
    [429, 'VISION_LIMIT_REACHED'],
    [500, 'VISION_UNAVAILABLE'],
    [503, 'VISION_UNAVAILABLE'],
  ])('reports upstream HTTP %s without exposing its response body', async (status, code) => {
    fetchMock.mockResolvedValue(Response.json({
      error: { code: 'provider_error_code', type: 'provider_error_type', message: `Private: ${env.VISION_API_KEY}` },
    }, { status, headers: { 'x-request-id': 'req-123' } }));

    await expect(new OpenAiCompatibleVisionProvider(env).analyzeImage(image)).rejects.toMatchObject({ status: 502, code });
    expect(console.warn).toHaveBeenCalledWith('Vision provider request failed:', {
      host: 'vision.example', status, code: 'provider_error_code', type: 'provider_error_type', requestId: 'req-123',
    });
    const logs = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logs).not.toContain(env.VISION_API_KEY);
    expect(logs).not.toContain(image.toString('base64'));
  });

  it('preserves HTTP diagnostics when the provider returns HTML instead of JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Upstream unavailable</html>', { status: 502 }));

    await expect(new OpenAiCompatibleVisionProvider(env).analyzeImage(image))
      .rejects.toMatchObject({ status: 502, code: 'VISION_UNAVAILABLE' });
    expect(console.warn).toHaveBeenCalledWith('Vision provider request failed:', expect.objectContaining({ status: 502 }));
  });

  it('omits diagnostic fields containing credentials or arbitrary text', async () => {
    fetchMock.mockResolvedValue(Response.json({
      error: { code: env.VISION_API_KEY, type: `image: ${image.toString('base64')}` },
    }, { status: 401, headers: { 'x-request-id': env.VISION_API_KEY } }));

    await expect(new OpenAiCompatibleVisionProvider(env).analyzeImage(image)).rejects.toMatchObject({ code: 'VISION_ACCESS_DENIED' });
    expect(console.warn).toHaveBeenCalledWith('Vision provider request failed:', {
      host: 'vision.example', status: 401, code: undefined, type: undefined, requestId: undefined,
    });
  });

  it.each([
    '<html>Not JSON</html>',
    'null',
    '{}',
    JSON.stringify({ choices: [{ message: { content: ['unexpected array'] } }] }),
    JSON.stringify({ choices: [{ message: { content: 'not JSON' } }] }),
    JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ...valid, confidence: 2 }) } }] }),
  ])('rejects malformed successful responses: %s', async body => {
    fetchMock.mockResolvedValue(new Response(body));

    await expect(new OpenAiCompatibleVisionProvider(env).analyzeImage(image))
      .rejects.toMatchObject({ status: 502, code: 'INVALID_VISION_RESPONSE' });
  });

  it('logs a connection error code without logging the exception message', async () => {
    fetchMock.mockRejectedValue(new TypeError(`Private: ${env.VISION_API_KEY}`, { cause: { code: 'ENOTFOUND' } }));

    await expect(new OpenAiCompatibleVisionProvider(env).analyzeImage(image))
      .rejects.toMatchObject({ status: 502, code: 'VISION_UNAVAILABLE', message: 'No se pudo contactar el servicio de visión.' });
    expect(console.warn).toHaveBeenCalledWith('Vision provider connection failed:', { host: 'vision.example', code: 'ENOTFOUND' });
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(env.VISION_API_KEY);
  });

  it('aborts requests that exceed the configured timeout', async () => {
    fetchMock.mockImplementation((_url, request) => new Promise((_resolve, reject) => {
      request?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));

    await expect(new OpenAiCompatibleVisionProvider({ ...env, VISION_TIMEOUT_MS: 10 }).analyzeImage(image))
      .rejects.toMatchObject({ status: 504, code: 'VISION_TIMEOUT' });
    expect(console.warn).toHaveBeenCalledWith('Vision provider request timed out:', { timeoutMs: 10 });
  });
});
