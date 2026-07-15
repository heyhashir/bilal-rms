import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { ApiResponse } from '../utils/ApiResponse';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const requireApiCsrfHeader = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method.toUpperCase()) || env.isTest) {
    next();
    return;
  }

  const requestedWith = req.header('x-requested-with');
  if (requestedWith === 'XMLHttpRequest') {
    next();
    return;
  }

  res.status(403).json(ApiResponse.error('State-changing requests must include the expected application header'));
};
