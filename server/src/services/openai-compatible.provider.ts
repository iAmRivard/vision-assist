import type { Environment } from '../config/env.js';
import { visionAnalysisSchema } from '../schemas/vision.schema.js';
import type { VisionProvider } from '../types/vision.js';
import { AppError } from '../utils/app-error.js';
import { visionPrompt } from './vision-prompt.js';

function providerHttpError(status: number): AppError {
  if (status === 401 || status === 403) {
    return new AppError(502, 'VISION_ACCESS_DENIED', 'No se pudo acceder al servicio de visión.');
  }
  if (status === 404) {
    return new AppError(502, 'VISION_CONFIGURATION_ERROR', 'El servicio de visión no está configurado correctamente.');
  }
  if (status === 429) {
    return new AppError(502, 'VISION_LIMIT_REACHED', 'El servicio de visión alcanzó su límite de uso.');
  }
  if (status === 400 || status === 422) {
    return new AppError(502, 'VISION_REQUEST_REJECTED', 'El servicio de visión rechazó la solicitud de identificación.');
  }
  return new AppError(502, 'VISION_UNAVAILABLE', 'El servicio de visión no está disponible.');
}

// Log only bounded diagnostic tokens, never provider messages, images or credentials.
function diagnosticToken(value: unknown, apiKey: string): string | undefined {
  return typeof value === 'string' && /^[a-z0-9_.:-]{1,128}$/i.test(value) && !value.includes(apiKey)
    ? value : undefined;
}

export class OpenAiCompatibleVisionProvider implements VisionProvider {
  constructor(private readonly env: Environment) {}
  async analyzeImage(image: Buffer) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.env.VISION_TIMEOUT_MS);
    // GPT-6 defaults to reasoning, where sampling parameters are unsupported.
    const sampling = /^gpt-6(?:[.-]|$)/.test(this.env.VISION_MODEL) ? {} : { temperature: 0 };
    try {
      const response = await fetch(`${this.env.VISION_API_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${this.env.VISION_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.env.VISION_MODEL, ...sampling,
          response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [
            { type: 'text', text: visionPrompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image.toString('base64')}` } },
          ] }] }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as {
          error?: { code?: unknown; type?: unknown };
        } | null;
        console.warn('Vision provider request failed:', {
          host: new URL(this.env.VISION_API_BASE_URL).host,
          status: response.status,
          code: diagnosticToken(payload?.error?.code, this.env.VISION_API_KEY),
          type: diagnosticToken(payload?.error?.type, this.env.VISION_API_KEY),
          requestId: diagnosticToken(response.headers.get('x-request-id') ?? response.headers.get('request-id'), this.env.VISION_API_KEY),
        });
        throw providerHttpError(response.status);
      }
      let payload: { choices?: Array<{ message?: { content?: unknown } }> } | null;
      try {
        payload = await response.json() as typeof payload;
      } catch {
        console.warn('Vision provider returned invalid JSON:', { status: response.status });
        throw new AppError(502, 'INVALID_VISION_RESPONSE', 'El servicio devolvió una respuesta inválida.');
      }
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new AppError(502, 'INVALID_VISION_RESPONSE', 'La respuesta del servicio de visión está vacía o no tiene el formato esperado.');
      }
      let parsed: unknown;
      try { parsed = JSON.parse(content); } catch { throw new AppError(502, 'INVALID_VISION_RESPONSE', 'El servicio devolvió una respuesta inválida.'); }
      const validated = visionAnalysisSchema.safeParse(parsed);
      if (!validated.success) {
        console.warn('Vision response validation failed:', validated.error.issues.map(issue => ({ path: issue.path.join('.'), code: issue.code })));
        throw new AppError(502, 'INVALID_VISION_RESPONSE', 'El resultado no tiene el formato esperado.');
      }
      return validated.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Vision provider request timed out:', { timeoutMs: this.env.VISION_TIMEOUT_MS });
        throw new AppError(504, 'VISION_TIMEOUT', 'La identificación tardó demasiado.');
      }
      const cause = error instanceof Error ? error.cause as { code?: unknown } | undefined : undefined;
      console.warn('Vision provider connection failed:', {
        host: new URL(this.env.VISION_API_BASE_URL).host,
        code: diagnosticToken(cause?.code, this.env.VISION_API_KEY),
      });
      throw new AppError(502, 'VISION_UNAVAILABLE', 'No se pudo contactar el servicio de visión.');
    } finally { clearTimeout(timer); }
  }
}
