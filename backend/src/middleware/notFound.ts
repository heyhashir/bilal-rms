import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../types/ApiError';

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
