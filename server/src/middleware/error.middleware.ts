import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, error: { code: error.code, message: error.code === 'LIMIT_FILE_SIZE' ? 'La imagen es demasiado grande.' : 'Archivo inválido.' } }); return;
  }
  if (error instanceof ZodError) { res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos.' } }); return; }
  if (error instanceof AppError) { res.status(error.status).json({ success: false, error: { code: error.code, message: error.message } }); return; }
  console.error(error instanceof Error ? error.message : 'Unknown server error');
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error interno.' } });
};
