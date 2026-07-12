import type { NextFunction, Request, Response } from 'express';
import type { AnalysisRepository } from '../database/repositories/analysis.repository.js';
import { paginationSchema, uuidSchema } from '../schemas/vision.schema.js';
import type { VisionService } from '../services/vision.service.js';
import { AppError } from '../utils/app-error.js';

export class VisionController {
  constructor(private readonly service: VisionService, private readonly repository: AnalysisRepository) {}
  analyze = async (req: Request, res: Response, next: NextFunction) => { try {
    if (!req.file?.buffer.length) throw new AppError(400, 'EMPTY_IMAGE', 'Debes enviar una imagen válida.');
    const stored = await this.service.analyze(this.ownerHash(res), req.file.buffer);
    const { id, createdAt: _createdAt, ...result } = stored;
    res.status(201).json({ success: true, analysisId: id, result });
  } catch (e) { next(e); } };
  history = async (req: Request, res: Response, next: NextFunction) => { try { const p = paginationSchema.parse(req.query); res.json({ success: true, ...(await this.repository.list(this.ownerHash(res), p.page, p.limit)) }); } catch (e) { next(e); } };
  find = async (req: Request, res: Response, next: NextFunction) => { try { const item = await this.repository.find(this.ownerHash(res), uuidSchema.parse(req.params['id'])); if (!item) throw new AppError(404, 'NOT_FOUND', 'Análisis no encontrado.'); res.json({ success: true, result: item }); } catch (e) { next(e); } };
  remove = async (req: Request, res: Response, next: NextFunction) => { try { const removed = await this.repository.delete(this.ownerHash(res), uuidSchema.parse(req.params['id'])); if (!removed) throw new AppError(404, 'NOT_FOUND', 'Análisis no encontrado.'); res.status(204).send(); } catch (e) { next(e); } };
  removeAll = async (_req: Request, res: Response, next: NextFunction) => { try { const deleted = await this.repository.deleteAll(this.ownerHash(res)); res.json({ success: true, deleted }); } catch (e) { next(e); } };
  private ownerHash(res: Response) { return res.locals['ownerHash'] as string; }
}
