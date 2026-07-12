import type { Environment } from '../config/env.js';
import { visionAnalysisSchema } from '../schemas/vision.schema.js';
import type { VisionProvider } from '../types/vision.js';
import { AppError } from '../utils/app-error.js';
import { visionPrompt } from './vision-prompt.js';

export class OpenAiCompatibleVisionProvider implements VisionProvider {
  constructor(private readonly env: Environment) {}
  async analyzeImage(image: Buffer) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.env.VISION_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.env.VISION_API_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${this.env.VISION_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.env.VISION_MODEL, temperature: 0,
          response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [
            { type: 'text', text: visionPrompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image.toString('base64')}` } },
          ] }] }),
      });
      if (!response.ok) throw new AppError(502, 'VISION_UNAVAILABLE', 'El servicio de visión no está disponible.');
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new AppError(502, 'INVALID_VISION_RESPONSE', 'La respuesta del servicio de visión está vacía.');
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
      if (error instanceof Error && error.name === 'AbortError') throw new AppError(504, 'VISION_TIMEOUT', 'La identificación tardó demasiado.');
      throw new AppError(502, 'VISION_UNAVAILABLE', 'No se pudo contactar el servicio de visión.');
    } finally { clearTimeout(timer); }
  }
}
