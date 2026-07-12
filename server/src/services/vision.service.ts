import { randomUUID } from 'node:crypto';
import type { AnalysisRepository } from '../database/repositories/analysis.repository.js';
import type { VisionProvider } from '../types/vision.js';
export class VisionService {
  constructor(private readonly provider: VisionProvider, private readonly repository: AnalysisRepository) {}
  async analyze(ownerHash: string, image: Buffer) { const result = await this.provider.analyzeImage(image); return this.repository.create(randomUUID(), ownerHash, result); }
}
