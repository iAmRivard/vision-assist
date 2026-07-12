import cors from 'cors'; import express from 'express';
import type { Environment } from './config/env.js';
import { VisionController } from './controllers/vision.controller.js';
import { AnalysisRepository } from './database/repositories/analysis.repository.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { createVisionRouter } from './routes/vision.routes.js';
import { OpenAiCompatibleVisionProvider } from './services/openai-compatible.provider.js';
import { VisionService } from './services/vision.service.js';
import type { Pool } from 'pg';
export const createApp = (env: Environment, db: Pool) => {
  const app = express(); app.disable('x-powered-by'); app.use(cors({ origin: env.CORS_ORIGIN.split(',').map(v => v.trim()) })); app.use(express.json({ limit: '50kb' }));
  const repository = new AnalysisRepository(db); const service = new VisionService(new OpenAiCompatibleVisionProvider(env), repository);
  app.get('/api/v1/health', async (_req, res, next) => { try { await db.query('SELECT 1'); res.json({ success: true, status: 'ok' }); } catch (e) { next(e); } });
  app.use('/api/v1/vision', createVisionRouter(new VisionController(service, repository), env)); app.use((_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } })); app.use(errorMiddleware); return app;
};
