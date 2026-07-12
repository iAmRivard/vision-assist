import { createHmac } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Environment } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

const clientIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const hashClientId = (clientId: string, secret: string) =>
  createHmac('sha256', secret).update(clientId).digest('hex');

export const createClientIdentity = (env: Environment) =>
  (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.header('X-Client-ID');
    if (!clientId || !clientIdPattern.test(clientId)) {
      next(new AppError(401, 'CLIENT_ID_REQUIRED', 'La instalación no está identificada.'));
      return;
    }
    res.locals['ownerHash'] = hashClientId(clientId, env.CLIENT_ID_HASH_SECRET);
    next();
  };
