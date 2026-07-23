import { randomBytes } from 'crypto';
import { Response } from 'express';
import { env } from '../config/env';

export const createSessionToken = (): string => randomBytes(32).toString('hex');

export const setSessionCookie = (res: Response, token: string, expiresAt: Date): void => {
  res.cookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
};

export const clearSessionCookie = (res: Response): void => {
  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
  });
};
