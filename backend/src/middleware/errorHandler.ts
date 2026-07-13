import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
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
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        message = 'A record with the same value already exists';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'The requested record no longer exists';
        break;
      case 'P2003':
        statusCode = 409;
        message = 'This change conflicts with related records';
        break;
      default:
        statusCode = 500;
        message = env.isProduction ? 'Database operation failed' : err.message;
        break;
    }
    errors = [{ code: err.code }];
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = env.isProduction ? 'Invalid database input' : err.message;
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `Uploaded file exceeds the ${env.MAX_UPLOAD_MB}MB limit`
        : 'Upload validation failed';
  } else if (err instanceof Error) {
    message = env.isProduction ? 'Internal Server Error' : err.message;
  }

  const logPayload = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    stack: err.stack,
  };

  if (statusCode >= 500) {
    logger.error(message, logPayload);
  } else if (statusCode >= 400) {
    logger.warn(message, logPayload);
  } else {
    logger.info(message, logPayload);
  }

  res.status(statusCode).json(ApiResponse.error(message, errors));
};
