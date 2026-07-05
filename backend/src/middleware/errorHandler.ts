import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { ApiError } from '../types/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: unknown[] = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.issues;
  } else if (err instanceof Error) {
    message = env.isProduction ? 'Internal Server Error' : err.message;
  }

  logger.error(message, {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    stack: err.stack,
  });

  res.status(statusCode).json(ApiResponse.error(message, errors));
};
