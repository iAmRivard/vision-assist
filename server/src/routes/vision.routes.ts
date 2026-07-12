import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { Environment } from '../config/env.js';
import type { VisionController } from '../controllers/vision.controller.js';
import { createClientIdentity } from '../middleware/client-identity.middleware.js';
import { createUpload } from '../middleware/upload.middleware.js';
export const createVisionRouter = (controller: VisionController, env: Environment) => {
  const router = Router(); const upload = createUpload(env);
  const limiter = rateLimit({ windowMs: 60_000, limit: env.ANALYZE_RATE_LIMIT_PER_MINUTE, standardHeaders: true, legacyHeaders: false });
  router.use(createClientIdentity(env));
  router.post('/analyze', limiter, upload.single('image'), controller.analyze);
  router.get('/history', controller.history); router.delete('/history', controller.removeAll); router.get('/history/:id', controller.find); router.delete('/history/:id', controller.remove);
  return router;
};
