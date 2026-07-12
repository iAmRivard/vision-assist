import multer from 'multer';
import type { Environment } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
export const createUpload = (env: Environment) => multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: env.MAX_IMAGE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, done) => file.mimetype.startsWith('image/') ? done(null, true) : done(new AppError(415, 'INVALID_IMAGE_TYPE', 'Solo se aceptan imágenes.')) });
