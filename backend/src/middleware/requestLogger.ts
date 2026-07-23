import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      contentLength: res.getHeader('content-length') ?? null,
      userId: req.currentUser?.id ?? null,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });

  next();
};
